import {
  Body,
  Controller,
  Get,
  Path,
  Post,
  Query,
  Route,
  Security,
  SuccessResponse,
  Tags,
  Request,
} from "tsoa";
import { AuthMethod, AuthScope, logger, OAuth2Session } from "../core";
import { authService, jwtExpiresIn } from "../services";
import express, { Response as ExResponse, Request as ExRequest } from "express";
import ms from "ms";
import { AUTHENTICATION_HEADER, JWT_COOKIE_NAME } from "../security";

@Tags('Authentication')
@Route("auth")
export class AuthController extends Controller {

  /**
   * Login to service *after* getting the authorization service OAuth2 code.
   * @param body The OAuth logon session
   */
  @Post("/oauth2")
  public async authByOAuth(@Body() body: OAuth2Session) {
    const jwtToken = await authService.authByOAuth(body);

    if (process.env.NODE_ENV === 'development') {
      this.setHeader(AUTHENTICATION_HEADER, jwtToken);
      this.setHeader('Access-Control-Allow-Headers', 'Authorization');
      this.setHeader('Access-Control-Expose-Headers', 'Authentication');
      return;
    }

    const maxAgeInSec = ms(jwtExpiresIn) / 1000;
    this.setHeader(
      'Set-Cookie',
      `${JWT_COOKIE_NAME}=${jwtToken}; Max-Age=${maxAgeInSec}; Path=/; HttpOnly; Secure; SameSite=None;`,
    );
  }

  @Security(AuthMethod.JWT, [AuthScope.USER])
  @Post("/logout")
  public async logout(@Request() request: ExRequest) {
    logger.info(`[AuthController.logout] user "${request.user.userId}" logout`);

    /** Currently there is no blacklist of invalid tokens */

    /** Send clean session by response to client browser. */
    this.setHeader('Set-Cookie', `${JWT_COOKIE_NAME}=0; Max-Age=120; Path=/; HttpOnly; Secure; SameSite=None;`);
  }
}
