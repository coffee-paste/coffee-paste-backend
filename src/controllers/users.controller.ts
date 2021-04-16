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
import { User } from "../models";
import { UsersService } from "../services";


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
}