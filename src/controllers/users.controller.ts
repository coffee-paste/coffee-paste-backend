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

  @Security(AuthMethod.JWT, [AuthScope.USER])
  @Get('/profile')
  public async getUserProfile(@Request() request: ExRequest) {
    return await usersService.getUser(request.user.userId);
  }

  @Security(AuthMethod.JWT, [AuthScope.USER])
  @Delete()
  public async deleteUser(@Request() request: ExRequest) {
    return await usersService.deleteUser(request.user.userId);
  }
}
