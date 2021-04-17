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

const welcomeMessage = `
_  _  _ _______        _______  _____  _______ _______ _______  _____ 
|  |  | |______ |      |       |     | |  |  | |______    |    |     |
|__|__| |______ |_____ |_____  |_____| |  |  | |______    |    |_____|
                                                                      
                 .d888 .d888                                              888            
                d88P" d88P"                                               888            
                888   888                                                 888            
 .d8888b .d88b. 888888888888 .d88b.  .d88b.       88888b.  8888b. .d8888b 888888 .d88b.  
d88P"   d88""88b888   888   d8P  Y8bd8P  Y8b      888 "88b    "88b88K     888   d8P  Y8b 
888     888  888888   888   8888888888888888888888888  888.d888888"Y8888b.888   88888888 
Y88b.   Y88..88P888   888   Y8b.    Y8b.          888 d88P888  888     X88Y88b. Y8b.     
 "Y8888P "Y88P" 888   888    "Y8888  "Y8888       88888P" "Y888888 88888P' "Y888 "Y8888  
                                                  888                                    
                                                  888                                    
                                                  888                                                                                                                                 
`;
// tslint:disable-next-line: no-console
console.log('\x1b[34m', welcomeMessage, '\x1b[0m');

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

