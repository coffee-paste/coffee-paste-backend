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
  Delete,
} from "tsoa";
import { User } from "../models";
import { usersService } from "../services";
import express, { Response as ExResponse, Request as ExRequest } from "express";
import { AuthMethod, AuthScope } from "../core";

@Tags('Users')
@Route("users")
export class UsersController extends Controller {

  @Security(AuthMethod.JWT, [AuthScope.USER])
  @Get('/profile')
  public async getUserProfile(@Request() request: ExRequest) {
    return await usersService.getUser(request.user.userId);
  }

  @Security(AuthMethod.JWT, [AuthScope.USER])
  @Get('/decrypt-local-key')
  public async getDecryptLocalKey(@Request() request: ExRequest) {
    return await usersService.getUserDecryptLocalKey(request.user.userId);
  }

  /**
   * Regenerate key for the local key storage (This is NOT a password for anything else!)
   * @param request 
   * @returns 
   */
  @Security(AuthMethod.JWT, [AuthScope.USER])
  @Post('/decrypt-local-key/regenerate')
  public async regenerateDecryptLocalKey(@Request() request: ExRequest): Promise<string> {
    return await usersService.regenerateUserDecryptLocalKey(request.user.userId);
  }

  /**
   * Increase the password-version-codename.
   * Call it when you decided to change your local password, and you want to mark all note that encrypted with the old password that their encryption is by the old version of the password
   * @returns The new version alias for the new password (there is no real meaning for it :)
   */
  @Security(AuthMethod.JWT, [AuthScope.USER])
  @Post('/increase-password-version-codename')
  public async increaseUserPasswordVersionCodeName(@Request() request: ExRequest): Promise<string> {
    return await usersService.increaseUserPasswordVersionCodeName(request.user.userId);
  }

  /**
   * Increase the certificate-version-codename.
   * Call it when you decided to change your local certificate, and you want to mark all note that encrypted with the old certificate that their encryption is by the old version of the certificate
   * @returns The new version alias for the new certificate (there is no real meaning for it :)
   */
   @Security(AuthMethod.JWT, [AuthScope.USER])
   @Post('/increase-certificate-version-codename')
   public async increaseUseCertificateVersionCodeName(@Request() request: ExRequest): Promise<string> {
     return await usersService.increaseUseCertificateVersionCodeName(request.user.userId);
   }

  @Security(AuthMethod.JWT, [AuthScope.USER])
  @Delete()
  public async deleteUser(@Request() request: ExRequest) {
    return await usersService.deleteUser(request.user.userId);
  }

  ////////////// ADMIN API's //////////////////

  @Security(AuthMethod.API_KEY, [AuthScope.ADMIN])
  @Get("{userId}")
  public async getUser(@Path() userId: string): Promise<User> {
    return await usersService.getUser(userId);
  }

  @Security(AuthMethod.API_KEY, [AuthScope.ADMIN])
  @Get()
  public async getUsers(): Promise<User[]> {
    return await usersService.getUsers();
  }

  @Security(AuthMethod.API_KEY, [AuthScope.ADMIN])
  @Delete('{userId}')
  public async deleteUserByAdmin(@Path() userId: string) {
    return await usersService.deleteUser(userId);
  }
}
