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
import { Auth } from "../core";
import { User } from "../models";
import { UsersService } from "../services";
import express, { Response as ExResponse, Request as ExRequest } from "express";


@Tags('Users')
@Route("users")
export class UsersController extends Controller {
  // @Security('api_key', ['admin'])
  // @Get("{userId}")
  // public async getUser(@Path() userId: string): Promise<User> {
  //   return await new UsersService().getUser(userId);
  // }

  // @Security('api_key', ['admin'])
  // @Get()
  // public async getUsers(): Promise<User[]> {
  //   return await new UsersService().getUsers();
  // }

  // @Security('api_key', ['admin'])
  // @Delete('{userId}')
  // public async deleteUserByAdmin(@Path() userId: string) {
  //   return await new UsersService().deleteUser(userId);
  // }

  @Security('jwt', ['user'])
  @Delete()
  public async deleteUser(@Request() request: ExRequest) {
    return await new UsersService().deleteUser(request.user.userId);
  }
}
