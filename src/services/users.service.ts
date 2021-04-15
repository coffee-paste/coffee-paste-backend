import { Note, User } from "../models";
import { getUserData, getUsersData } from "../data";
import { logger } from "../core";

// A post request should not contain an id.
// export type UserCreationParams = Pick<User, "email" | "name" | "phoneNumbers">;

export class UsersService {

  public async getUser(id: string): Promise<User> {
    logger.info(`[UsersService.getUser] About to get user "${id}" info ...`);
    const user = await getUserData(id);
    logger.info(`[UsersService.getUser] Getting user "${id}" info succeed`);
    return user;
  }

  public async getUsers(): Promise<User[]> {
    logger.info(`[UsersService.getUsers] About to get all users info ...`);
    const users = await getUsersData();
    logger.info(`[UsersService.getUsers] Getting all users info succeed`);
    return users;
  }
}