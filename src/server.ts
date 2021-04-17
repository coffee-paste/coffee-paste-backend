import * as dotenv from 'dotenv';
import { existsSync } from 'fs';
import * as http from 'http';
// load environment variable from .env file before all
if (existsSync('.env')) {
    dotenv.config();
}

import { createConnection } from "typeorm";
import WebSocket from 'ws';
import { app } from "./app";
import { logger } from './core';
import { handleChannels } from './routes';

const port = process.env.PORT || 3000;

const server: any = http.createServer(app).listen(port, () => {
    logger.info(`coffee-paste app listening at http://0.0.0.0:${port}`);
});

(async () => {
    try {
        await createConnection();
        logger.info('successfully connected to DB.');

        const wss = new WebSocket.Server({ 
            server, 
            path : '/notes',
            perMessageDeflate: {
                zlibDeflateOptions: {
                  // See zlib defaults.
                  chunkSize: 1024,
                  memLevel: 7,
                  level: 3
                },
                zlibInflateOptions: {
                  chunkSize: 10 * 1024
                },
                // Other options settable:
                clientNoContextTakeover: true, // Defaults to negotiated value.
                serverNoContextTakeover: true, // Defaults to negotiated value.
                serverMaxWindowBits: 10, // Defaults to negotiated value.
                // Below options specified as default values.
                concurrencyLimit: 10, // Limits zlib concurrency for perf.
                threshold: 1024 // Size (in bytes) below which messages
                // should not be compressed.
              }
        });
        handleChannels(wss);
        logger.info('Server WSS channel is up-and-running');

    } catch (error) {
        logger.error('DB connection failed, exiting...', error);
        process.exit();
    }
})();

