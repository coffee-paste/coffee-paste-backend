import express, { Response as ExResponse, Request as ExRequest } from "express";
import * as jwt from 'jsonwebtoken';
import { logger, VerifiedUser } from "../core";

export const JWT_SECRET = process.env.JWT_SECRET || '';
if (!JWT_SECRET) {
  logger.fatal('You must set the JWT_SECRET!');
  process.exit();
}

export function  expressAuthentication(request: ExRequest, securityName: string, scopes?: string[]): Promise<any> {
    return new Promise((resolve, reject) => {
        const logPrefix = `[expressAuthentication][${request.method} ${request.url}]`
        
        if (securityName !== "jwt") {
            logger.fatal(`${logPrefix} unknown security name ${securityName}`);
            reject(new Error(`unknown security name ${securityName}`));
        }

        const token = request.headers["authentication"] as string;

        if (!token || typeof token !== 'string') {
            logger.error(`${logPrefix} No token provided`);
            reject(new Error("No token provided"));
        }
        jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
            if (err) {
                logger.error(`${logPrefix} token invalid`, err);
                reject(err);
            } else {
                // Check if JWT contains all required scopes
                // for (let scope of scopes) {
                //   if (!decoded.scopes.includes(scope)) {
                //     reject(new Error("JWT does not contain required scope."));
                //   }
                // }
                logger.info(`${logPrefix} JWT verified user "${decoded.userId}" successfully`);
                resolve({ userId: decoded.userId } as VerifiedUser);
            }
        });
    });
}

// Define the express verified user extension
declare global {
    namespace Express {
        interface Request {
            user: VerifiedUser
        }
    }
}
