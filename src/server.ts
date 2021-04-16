import * as dotenv from 'dotenv';
import { existsSync } from 'fs';
// load environment variable from .env file before all
if (existsSync('.env')) {
    dotenv.config();
}

import { createConnection } from "typeorm";
import { app } from "./app";

const port = process.env.PORT || 3000;

app.listen(port, () =>
    console.log(`coffee-paste app listening at http://0.0.0.0:${port}`)
);

(async () => {
    try {
        await createConnection();
        console.info('successfully connected to DB.');
    } catch (error) {
        console.error('DB connection failed, exiting...', error);
        process.exit();
    }
})();