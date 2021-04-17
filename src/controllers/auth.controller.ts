import {
  Body,
  Controller,
  Get,
  Path,
  Post,
  Query,
  Route,
  SuccessResponse,
  Tags,
} from "tsoa";
import { OAuth2Session } from "../core";
import { authService } from "../services";

@Tags('Authentication')
@Route("auth")
export class AuthController extends Controller {

  /**
   * Login to service *after* getting the authorization service OAuth2 code.
   * @param body The OAuth logon session
   */
  @Post("/oauth2")
  public async authByOAuth(@Body() body : OAuth2Session) {
    const jwtToken = await authService.authByOAuth(body);
    this.setHeader('Authentication', jwtToken);
  }
}
