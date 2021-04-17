import express, { Response as ExResponse, Request as ExRequest } from "express";
import bodyParser from "body-parser";
import { RegisterRoutes } from "./routes";
import swaggerUi from "swagger-ui-express";
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { sanitizeExpressMiddleware } from 'generic-json-sanitizer';
import helmet from 'helmet';
import { logger } from "./core";

export const app = express();

// Open cors access
app.use(cors())

// Protect from XSS and other malicious attacks
app.use(helmet());
app.use(helmet.frameguard({ action: 'deny' }));


// Protect from DDOS and access thieves
app.use(rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 2000,
}));

// Use body parser to read sent json payloads
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);
app.use(bodyParser.json({ limit: '2mb' })); // for parsing application/json

// Sanitize Json schema arrived from client.
// to avoid stored XSS issues.
// 
app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {

  // Skip XSS sanitation for HTML content sent from the user fpr his note.
  if (req.url.startsWith('/notes/content/') && req.method.toLowerCase() === 'put') {
    next();
    return;
  }

  sanitizeExpressMiddleware(req, res, next, {
    allowedAttributes: {},
    allowedTags: [],
  });
});

// After *ALL* security checks and data validation, run the TSOA router
RegisterRoutes(app);

app.use("/docs", swaggerUi.serve, async (_req: ExRequest, res: ExResponse) => {
  return res.send(
    swaggerUi.generateHTML(await import("./swagger.json"))
  );
});

// Add security manifest
app.get('/.well-known/security.txt', (req, res) => {
  res.setHeader('Content-type', 'application/octet-stream');
  res.setHeader('Content-disposition', 'attachment; filename=security.txt');
  res.send(`
            This server build by an open-source project at https://github.com/coffee-paste/coffee-paste-backend.
            If you would like to report a security issue in the code-base please open an issue in the repository,
            or contact me directly via my profile https://github.com/haimkastner.
            Thanks!
        `);
});

// Unknown routing get 404
app.use('*', (req, res) => {
  res.statusCode = 404;
  res.send();
});

/**
 * Production error handler, no stacktrace leaked to user.
 */
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    logger.error(
      `express route crash,  req: ${req.method} ${req.path} error: ${err.message} user: ${req.user?.userId || 'unknown'} body: ${JSON.stringify(
        req.body,
      )}`,
    );
  } catch (error) {
    logger.error(`Ok... even the crash route catcher crashed...`);
  }
  res.status(500).send();
});
