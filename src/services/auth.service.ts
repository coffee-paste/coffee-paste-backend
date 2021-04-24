import { createOrSetUserData, getUserData, getUsersData } from "../data";
import { logger, OAuth2Service, OAuth2Session } from "../core";
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

export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
if (!GOOGLE_CLIENT_ID) {
  logger.fatal('You must set the GOOGLE_CLIENT_ID!');
  process.exit();
}

export const GOOGLE_SECRET = process.env.GOOGLE_SECRET || '';
if (!GOOGLE_SECRET) {
  logger.fatal('You must set the GOOGLE_SECRET!');
  process.exit();
}

export const GITLAB_CLIENT_ID = process.env.GITLAB_CLIENT_ID || '';
if (!GITLAB_CLIENT_ID) {
  logger.fatal('You must set the GITLAB_CLIENT_ID!');
  process.exit();
}

export const GITLAB_SECRET = process.env.GITLAB_SECRET || '';
if (!GITLAB_SECRET) {
  logger.fatal('You must set the GITLAB_SECRET!');
  process.exit();
}

export const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '2 days';

interface OAuthUserInfo {
  uniqueOAuthId: string;
  email: string;
  displayName: string;
  avatarUrl: string;
}

class AuthService {

  private async getAvatarBase64(avatarUrl: string): Promise<string> {
    logger.info(`[AuthService.getAvatarBase64] About to get user avatar ...`);
    try {
      const response = await fetch(avatarUrl);
      const data = await response.buffer();
      const base64 = data.toString('base64');
      logger.info(`[AuthService.getAvatarBase64] Get user avatar succeed`);
      return base64;
    } catch (error) {
      logger.warn(`[AuthService.getAvatarBase64] Get user avatar failed`, error);
      return '';
    }
  }

  private async validateGitHubOAuth2Session(oauth2Session: OAuth2Session): Promise<OAuthUserInfo> {
    const body: any = {
      client_id: GITHUB_CLIENT_ID,
      client_secret: GITHUB_SECRET,
      code: oauth2Session.code,
    };

    const getTokenOption = {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    };

    logger.info(`[AuthService.validateGitHubOAuth2Session] About to validate user code "${oauth2Session.code}" and get token using GitHub's API ...`);
    const authResponse = await fetch('https://github.com/login/oauth/access_token', getTokenOption);
    const authPayload = await authResponse.json() as { access_token: string };

    authPayload.access_token;

    if (!authPayload.access_token) {
      logger.error(`[AuthService.validateGitHubOAuth2Session] Validate code "${oauth2Session.code}"  failed`, authPayload);
      throw new Error(JSON.stringify(authPayload));
    }

    logger.info(`[AuthService.validateGitHubOAuth2Session] Validate and get token for code "${oauth2Session.code}"  successfully`);

    logger.info(`[AuthService.validateGitHubOAuth2Session] About to get user info for code "${oauth2Session.code}"  ...`);

    const getInfoOption = {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `token ${authPayload.access_token}`
      },
    };

    const infoResponse = await fetch('https://api.github.com/user', getInfoOption);
    const { id, email, name, avatar_url } = await infoResponse.json() as { id: string; email: string, name: string, avatar_url: string };

    logger.info(`[AuthService.validateGitHubOAuth2Session] User "${email}" successfully get user info using code "${oauth2Session.code}"  ...`);

    return {
      email,
      uniqueOAuthId: id,
      displayName: name,
      avatarUrl: avatar_url,
    }
  }

  private async validateGoogleOAuth2Session(oauth2Session: OAuth2Session): Promise<OAuthUserInfo> {

    const getTokenOption = {
      method: 'POST',
      headers: { 'Accept': 'application/json' },
    };

    logger.info(`[AuthService.validateGoogleOAuth2Session] About to validate user code "${oauth2Session.code}" and get token using GOOGLE's API ...`);
    const authResponse = await fetch(`https://oauth2.googleapis.com/token?code=${oauth2Session.code}&client_id=${GOOGLE_CLIENT_ID}&client_secret=${GOOGLE_SECRET}&redirect_uri=${oauth2Session.redirectUri}&grant_type=authorization_code`, getTokenOption);

    const authPayload = await authResponse.json() as { access_token: string };

    authPayload.access_token;

    if (!authPayload.access_token) {
      logger.error(`[AuthService.validateGoogleOAuth2Session] Validate code "${oauth2Session.code}"  failed`, authPayload);
      throw new Error(JSON.stringify(authPayload));
    }

    logger.info(`[AuthService.validateGoogleOAuth2Session] Validate and get token for code "${oauth2Session.code}"  successfully`);

    logger.info(`[AuthService.validateGoogleOAuth2Session] About to get user info for code "${oauth2Session.code}"  ...`);

    const getInfoOption = {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${authPayload.access_token}`
      },
    };

    const infoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo?alt=json', getInfoOption);
    const { id, email, name, picture } = await infoResponse.json() as { id: string; email: string, name: string, picture: string };

    logger.info(`[AuthService.validateGoogleOAuth2Session] get user info for code "${oauth2Session.code}" user "${email}" successfully`);

    return {
      email,
      uniqueOAuthId: id,
      displayName: name,
      avatarUrl: picture,
    }
  }

  private async validateGitLabOAuth2Session(oauth2Session: OAuth2Session): Promise<OAuthUserInfo> {

    const getTokenOption = {
      method: 'POST',
      headers: { 'Accept': 'application/json' },
    };

    logger.info(`[AuthService.validateGitLabOAuth2Session] About to validate user code "${oauth2Session.code}" and get token using GOOGLE's API ...`);
    const authResponse = await fetch(`https://gitlab.com/oauth/token?client_id=${GITLAB_CLIENT_ID}&client_secret=${GITLAB_SECRET}&code=${oauth2Session.code}&grant_type=authorization_code&redirect_uri=${oauth2Session.redirectUri}`, getTokenOption);

    const authPayload = await authResponse.json() as { access_token: string };

    authPayload.access_token;

    if (!authPayload.access_token) {
      logger.error(`[AuthService.validateGitLabOAuth2Session] Validate code "${oauth2Session.code}"  failed`, authPayload);
      throw new Error(JSON.stringify(authPayload));
    }

    logger.info(`[AuthService.validateGitLabOAuth2Session] Validate and get token for code "${oauth2Session.code}"  successfully`);

    logger.info(`[AuthService.validateGitLabOAuth2Session] About to get user info for code "${oauth2Session.code}"  ...`);

    const getInfoOption = {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${authPayload.access_token}`
      },
    };

    const infoResponse = await fetch('https://gitlab.com/api/v4/user', getInfoOption);
    const { id, email, name, avatar_url } = await infoResponse.json() as { id: string; email: string, name: string, avatar_url: string };

    logger.info(`[AuthService.validateGitLabOAuth2Session] get user info for code "${oauth2Session.code}" user "${email}" successfully`);

    return {
      email,
      uniqueOAuthId: id,
      displayName: name,
      avatarUrl: avatar_url,
    }
  }

  public async authByOAuth(oauth2Session: OAuth2Session): Promise<string> {
    logger.info(`[AuthService.authByOAuth] About to login user using "${oauth2Session.oauth2Service}" code "${oauth2Session.code}" ...`);

    try {

      let userInfo: OAuthUserInfo = {} as OAuthUserInfo;
      switch (oauth2Session.oauth2Service) {
        case OAuth2Service.GitHub:
          userInfo = await this.validateGitHubOAuth2Session(oauth2Session);
          break;
        case OAuth2Service.Google:
          userInfo = await this.validateGoogleOAuth2Session(oauth2Session);
          break;
        case OAuth2Service.GitLab:
          userInfo = await this.validateGitLabOAuth2Session(oauth2Session);
        default:
          break;
      }

      // Add the OAuth service as unique prefix 
      userInfo.uniqueOAuthId = `${oauth2Session.oauth2Service}:${userInfo.uniqueOAuthId}`

      const avatarBase64 = await this.getAvatarBase64(userInfo.avatarUrl);
      logger.info(`[AuthService.authByOAuth] Getting user info for code "${oauth2Session.code}" uniqueOAuthId "${userInfo.uniqueOAuthId}" succeed`);

      logger.info(`[AuthService.authByOAuth] About to set user in system for code "${oauth2Session.code}" uniqueOAuthId "${userInfo.uniqueOAuthId}"  ...`);


      logger.info(`[AuthService.authByOAuth] About to set user in system for code "${oauth2Session.code}" uniqueOAuthId "${userInfo.uniqueOAuthId}"  ...`);

      const userId = await createOrSetUserData(userInfo.uniqueOAuthId, userInfo.email, userInfo.displayName, avatarBase64);

      const jwtToken = jwt.sign(
        {
          userId,
          email: userInfo.email,
          displayName: userInfo.displayName,
        },
        JWT_SECRET,
        {
          expiresIn: jwtExpiresIn,
        },
      );
      logger.info(`[AuthService.authByOAuth] Setting user "${userId}" in system for code "${oauth2Session.code}" uniqueOAuthId "${userInfo.uniqueOAuthId}" succeed, login proses successfully done`);
      return jwtToken;

    } catch (error) {
      logger.error(`[AuthService.authByOAuth] Validate and get token / info for code "${oauth2Session.code}" using "${oauth2Session.oauth2Service}" failed`, error);
      console.log(error);
      throw error;
    }
  }
}

export const authService = new AuthService();
