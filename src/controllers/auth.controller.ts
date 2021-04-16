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
import { Auth } from "../core";
import { AuthService } from "../services";

@Tags('Authentication')
@Route("auth")
export class AuthController extends Controller {

  /**
   * Login to service *after* getting the GitHub's OAuth2 code.
   * @param body The GitHub's session logon code
   */
  @Post("/github")
  public async authByGithub(@Body() body : Auth) {
    const jwtToken = await new AuthService().authByGithub(body.code);
    this.setHeader('Authentication', jwtToken);
  }
}
