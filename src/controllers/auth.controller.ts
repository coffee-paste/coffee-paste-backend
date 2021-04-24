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
import { logger, OAuth2Session } from "../core";
import { authService, jwtExpiresIn } from "../services";
import express, { Response as ExResponse, Request as ExRequest } from "express";
import ms from "ms";

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
      this.setHeader('Authentication', jwtToken);
      this.setHeader('Access-Control-Allow-Headers', 'Authorization');
      this.setHeader('Access-Control-Expose-Headers', 'Authentication');
      return;
    }

    const maxAgeInSec = ms(jwtExpiresIn) / 1000;
    this.setHeader(
      'Set-Cookie',
      `jwt_token=${jwtToken}; Max-Age=${maxAgeInSec}; Path=/; HttpOnly; Secure; SameSite=Strict;`,
    );
  }

  @Security('jwt', ['user'])
  @Post("/logout")
  public async logout(@Request() request: ExRequest) {
    logger.info(`[AuthController.logout] user "${request.user.userId}" logout`);

    /** Currently there is no blacklist of invalid tokens */

    /** Send clean session by response to client browser. */
    this.setHeader('Set-Cookie', `jwt_token=0;  Path=/;`);
  }
}
