import { Request as ExRequest } from 'express';
import * as jwt from 'jsonwebtoken';
import * as uuid from 'uuid';
import { AuthMethod, channelSessions, logger, VerifiedUser } from '../core';

export const AUTHENTICATION_HEADER = 'authentication';
export const API_KEY_HEADER = 'api_key';
export const JWT_COOKIE_NAME = 'jwt_token';

export const JWT_SECRET = process.env.JWT_SECRET || '';
if (!JWT_SECRET) {
	logger.fatal('You must set the JWT_SECRET!');
	process.exit();
}

export const API_KEY = process.env.API_KEY || '';

export function generateChannelSession(verifiedUser: VerifiedUser): string {
	const channelSession = uuid.v4();
	channelSessions.set(channelSession, verifiedUser);
	logger.info(`[verifyChannelKey.generateChannelSession] Generating for user "${verifiedUser.userId}"  channelSession "${channelSession}" succeed`);
	return channelSession;
}

export function verifyChannelSession(channelKey: string): VerifiedUser {
	const verifiedUser = channelSessions.get(channelKey);
	// The key uses is for only one time
	channelSessions.delete(channelKey);
	if (!verifiedUser) {
		logger.error(`[verifyChannelSession.verifyJwtToken] channelSession "${channelKey}" invalid`);
		throw new Error(`channelSession invalid`);
	}
	logger.info(`[verifyChannelSession.verifyJwtToken] Validating channel using for user "${verifiedUser.userId}"  using channelSession "${channelKey}" succeed`);
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function expressAuthentication(request: ExRequest, securityName: string, scopes?: string[]): Promise<VerifiedUser> {
	const logPrefix = `[expressAuthentication][${request.method} ${request.url}]`;

	// If the request required api-key validation
	if (securityName === AuthMethod.API_KEY) {
		if (!API_KEY) {
			logger.error(`${logPrefix} In order to logon with api you have to set the "${API_KEY}" variable`);
			throw new Error(`unknown security name ${securityName}`);
		}

		if (API_KEY === request.headers[API_KEY_HEADER]) {
			// As admin, there is no relevant user id
			return { userId: '' };
		}
		logger.error(`${logPrefix} No correct api-key provided`);
		throw new Error(`unknown api key`);
	}

	if (securityName !== AuthMethod.JWT) {
		logger.fatal(`${logPrefix} unknown security name ${securityName}`);
		throw new Error(`unknown security name ${securityName}`);
	}

	// The authentication header sent, use it as the token.
	// Note, that as default in production the token saved only in a secure cookie to avoid XSS.
	// But we still support using API with authentication header
	if (request.headers[AUTHENTICATION_HEADER]) {
		request.cookies[JWT_COOKIE_NAME] = request.headers[AUTHENTICATION_HEADER] as string;
	}

	const token = request.cookies[JWT_COOKIE_NAME] as string;

	if (!token || typeof token !== 'string') {
		logger.error(`${logPrefix} No token provided`);
		throw new Error('No token provided');
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
