import express, { Response as ExResponse, Request as ExRequest } from "express";
import * as jwt from 'jsonwebtoken';
import { channelKeys, logger, VerifiedUser } from "../core";
import * as uuid from 'uuid';

export const JWT_SECRET = process.env.JWT_SECRET || '';
if (!JWT_SECRET) {
    logger.fatal('You must set the JWT_SECRET!');
    process.exit();
}

export function generateChannelKey(verifiedUser: VerifiedUser): string {
    const channelKey = uuid.v4();
    channelKeys.set(channelKey, verifiedUser);
    logger.info(`[verifyChannelKey.generateChannelKey] Generating for user "${verifiedUser.userId}"  channelKey "${channelKey}" succeed`);
    return channelKey;
}

export function verifyChannelKey(channelKey: string): VerifiedUser {
    const verifiedUser = channelKeys.get(channelKey);
    // The key uses is for only one time
    channelKeys.delete(channelKey);
    if (!verifiedUser) {
        logger.error(`[verifyChannelKey.verifyJwtToken] channelKey "${channelKey}" invalid`);
        throw new Error(`channelKey invalid`);
    }
    logger.info(`[verifyChannelKey.verifyJwtToken] Validating channel using for user "${verifiedUser.userId}"  using channelKey "${channelKey}" succeed`);
    return verifiedUser;
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

    if (process.env.NODE_ENV === 'development') {
        request.cookies.jwt_token = request.headers["authentication"] as string;
    }

    const token = request.cookies.jwt_token as string;

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
