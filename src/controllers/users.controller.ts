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

  /** 
   * The local storage salt encryption key.
   * This is *NOT* a password, it's only used to salt encrypt the user notes key stored in the local storage 
   * so only who that have access to the API will be able to read the local storage.
   * The real encryption key will never ever will be sent to the server.
   * @returns The local storage salt encryption key
   */
  @Security(AuthMethod.JWT, [AuthScope.USER])
  @Get('/local-storage-salt')
  public async getUserLocalStorageSalt(@Request() request: ExRequest) {
    return await usersService.getUserLocalStorageSalt(request.user.userId);
  }

  /**
   * Regenerate the user local storage salt encryption key, the actual meaning is that the user will have to re-type his password again in the browsers.
   * @returns The new local storage salt encryption key
   */
  @Security(AuthMethod.JWT, [AuthScope.USER])
  @Post('/local-storage-salt/regenerate')
  public async regenerateUserLocalStorageSalt(@Request() request: ExRequest): Promise<string> {
    return await usersService.regenerateUserLocalStorageSalt(request.user.userId);
  }

  /**
   * Increase the password-version-codename.
   * Call it when you decided to change your local password, and you want to mark all note that encrypted with the old password that their encryption is by the old version of the password
   * @returns The new version alias for the new password (there is no real meaning for it :)
   */
  @Security(AuthMethod.JWT, [AuthScope.USER])
  @Post('/new-password-version-codename')
  public async increaseUserPasswordVersionCodeName(@Request() request: ExRequest): Promise<string> {
    return await usersService.increaseUserPasswordVersionCodeName(request.user.userId);
  }

  /**
   * Increase the certificate-version-codename.
   * Call it when you decided to change your local certificate, and you want to mark all note that encrypted with the old certificate that their encryption is by the old version of the certificate
   * @returns The new version alias for the new certificate (there is no real meaning for it :)
   */
  @Security(AuthMethod.JWT, [AuthScope.USER])
  @Post('/new-certificate-version-codename')
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
