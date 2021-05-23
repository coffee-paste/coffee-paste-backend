import express, { Response as ExResponse, Request as ExRequest } from "express";
import bodyParser from "body-parser";
import { RegisterRoutes } from "./routes";
import swaggerUi from "swagger-ui-express";
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { sanitizeExpressMiddlewareAsync } from 'generic-json-sanitizer';
import helmet from 'helmet';
import { logger } from "./core";
import cookieParser from 'cookie-parser';

export const app = express();

// Open CORS to let frontend apps API access.
const { ALLOW_DASHBOARD_ORIGINS } = process.env;

// Get the domains (separated by ',') or use the default domains
const whitelist = ALLOW_DASHBOARD_ORIGINS
  ? ALLOW_DASHBOARD_ORIGINS.split(',')
  : ['http://127.0.0.1:8080', 'http://localhost:8080'];

logger.info('Opening CORS for the following origins:');
// tslint:disable-next-line: no-console
console.table(whitelist);
app.use(
  cors({
    credentials: true,
    origin: (origin, callback) => {
      /** If origin not sent (mean it`s same origin) or origin match white list, allow it. */
      if (!origin || whitelist.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error(`${origin} not allowed by CORS`));
      }
    },
  }),
);

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
app.use(cookieParser()); // Parse every request cookie to readable json.

// Sanitize Json schema arrived from client.
// to avoid stored XSS issues.
// 
app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {

  // Do not sanitize empty body :)
  if (!req.body) {
    next();
    return;
  }

  // Skip XSS sanitation for HTML content sent from the user fpr his note.
  if (req.url.startsWith('/notes/content/') && req.method.toLowerCase() === 'put') {
    next();
    return;
  }

  sanitizeExpressMiddlewareAsync(req, res, next);
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

app.get('/privacy-policy.txt', (req, res) => {
  res.setHeader('Content-type', 'application/octet-stream');
  res.setHeader('Content-disposition', 'attachment; filename=security.txt');
  res.send(`
            This service built as an open-source project at https://github.com/coffee-paste/coffee-paste-backend.
            Currently, it's a POC for the app, please notice that.
            Currently, we keep only your email, display name, and your avatar. and the content of the notes.
            You are able to remove all your info including user info and notes content at any time using the https://coffee-paste.herokuapp.com/docs/#/Users/DeleteUser API.
            Feel free to as any question at any time https://github.com/haimkastner.
            Thanks!
        `);
});

app.get('/therm-of-use.txt', (req, res) => {
  res.setHeader('Content-type', 'application/octet-stream');
  res.setHeader('Content-disposition', 'attachment; filename=security.txt');
  res.send(`
            This service built as an open-source project at https://github.com/coffee-paste/coffee-paste-backend.
            Currently, it's a POC for the app, please notice that.
            Currently, we offer the use free, please notice that this is only now for the POC time.
            Feel free to as any question at any time https://github.com/haimkastner.
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
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err?.status === 401) {
    res.status(401).send();
    return;
  }
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
