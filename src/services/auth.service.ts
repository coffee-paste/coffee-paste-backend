import { Note, User } from "../models";
import { createOrSetUserData, getUserData, getUsersData } from "../data";
import { logger } from "../core";
import * as jwt from 'jsonwebtoken';
import fetch from 'node-fetch';
import { JWT_SECRET } from "../security/authentication";

export const GITHUB_SECRET = process.env.GITHUB_SECRET || '';
if (!GITHUB_SECRET) {
  logger.fatal('You must set the GITHUB_SECRET!');
  process.exit();
}

export const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || '';
if (!GITHUB_CLIENT_ID) {
  logger.fatal('You must set the GITHUB_CLIENT_ID!');
  process.exit();
}

const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '2 days';

// A post request should not contain an id.
// export type UserCreationParams = Pick<User, "email" | "name" | "phoneNumbers">;

export class AuthService {

  public async authByGithub(oAuthCode: string): Promise<string> {
    logger.info(`[AuthService.authByGithub] About to login user using code "${oAuthCode}" ...`);

    const body: any = {
      client_id: GITHUB_CLIENT_ID,
      client_secret: GITHUB_SECRET,
      code: oAuthCode,
    };
    const getTokenOption = {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    };

    try {
      logger.info(`[AuthService.authByGithub] About to validate user code "${oAuthCode}" and get token using GitHub API ...`);
      const authResponse = await fetch('https://github.com/login/oauth/access_token', getTokenOption);
      const authPayload = await authResponse.json() as { access_token: string };

      authPayload.access_token;

      if (!authPayload.access_token) {
        throw new Error(JSON.stringify(authPayload));
      }
      logger.info(`[AuthService.authByGithub] Validate and get token for code "${oAuthCode}"  successfully`);

      logger.info(`[AuthService.authByGithub] About to get user info for code "${oAuthCode}"  ...`);

      const getInfoOption = {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: `token ${authPayload.access_token}`
        },
      };

      const infoResponse = await fetch('https://api.github.com/user', getInfoOption);
      const infoPayload = await infoResponse.json() as { email: string, name: string };

      logger.info(`[AuthService.authByGithub] Getting user info for code "${oAuthCode}"  succeed`);
      logger.info(`[AuthService.authByGithub] About to set user in system for code "${oAuthCode}" email "${infoPayload}"  ...`);

      const userId = await createOrSetUserData(infoPayload.email, infoPayload.name);

      const jwtToken = jwt.sign(
        {
          userId,
          email: infoPayload.email,
          displayName: infoPayload.name,
        },
        JWT_SECRET,
        {
          expiresIn: jwtExpiresIn,
        },
      );
      logger.info(`[AuthService.authByGithub] Setting user "${userId}" in system for code "${oAuthCode}" email "${infoPayload}" succeed, login proses successfully done`);
      return jwtToken;

    } catch (error) {
      logger.error(`[AuthService.authByGithub] Validate and get token / info for code "${oAuthCode}"  failed`, error);
      console.log(error);
      throw error;
    }
  }
}