import {
  Body,
  Controller,
  Get,
  Path,
  Post,
  Query,
  Route,
  SuccessResponse,
} from "tsoa";
import { User } from "../models";
import { UsersService } from "../services";

@Route("users")
export class UsersController extends Controller {
  @Get("{userId}")
  public async getUser(@Path() userId: string): Promise<User> {
    return await new UsersService().getUser(userId);
  }

  @Get()
  public async getUsers(): Promise<User[]> {
    return await new UsersService().getUsers();
  }
}