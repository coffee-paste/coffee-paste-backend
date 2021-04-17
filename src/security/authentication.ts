import express, { Response as ExResponse, Request as ExRequest } from "express";
import * as jwt from 'jsonwebtoken';
import { logger, VerifiedUser } from "../core";

export const JWT_SECRET = process.env.JWT_SECRET || '';
if (!JWT_SECRET) {
    logger.fatal('You must set the JWT_SECRET!');
    process.exit();
}

export function verifyJwtToken(token: string): Promise<VerifiedUser> {
    return new Promise<VerifiedUser>((resolve, reject) => {
        jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
            if (err) {
                logger.error(`[Authentication.verifyJwtToken] token invalid`, err);
                reject(err);
            } else {
                logger.info(`[Authentication.verifyJwtToken] JWT verified user "${decoded.userId}" successfully`);
                resolve(decoded as VerifiedUser);
            }
        });
    });
}


export async function expressAuthentication(request: ExRequest, securityName: string, scopes?: string[]): Promise<VerifiedUser> {
    const logPrefix = `[expressAuthentication][${request.method} ${request.url}]`

    if (securityName !== "jwt") {
        logger.fatal(`${logPrefix} unknown security name ${securityName}`);
        new Error(`unknown security name ${securityName}`);
    }

    const token = request.headers["authentication"] as string;

    if (!token || typeof token !== 'string') {
        logger.error(`${logPrefix} No token provided`);
        new Error("No token provided");
    }

    const verifiedUser = await verifyJwtToken(token);

    // Check if JWT contains all required scopes
    // for (let scope of scopes) {
    //   if (!decoded.scopes.includes(scope)) {
    //     reject(new Error("JWT does not contain required scope."));
    //   }
    // }

    logger.info(`${logPrefix} User session "${verifiedUser.userId}" verified`);
    return verifiedUser;
}
