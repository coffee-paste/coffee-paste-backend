import { Note, User } from "../models";
import { deleteUserData, getUserData, getUserDecryptLocalKeyData, getUsersData, setUserCertificateVersionCodeNameData, setUserDecryptLocalKeyData, setUserPasswordVersionCodeNameData } from "../data";
import { logger } from "../core";
import * as uuid from 'uuid';
import { uniqueNamesGenerator, adjectives, colors, animals } from "unique-names-generator";
import CryptoJS from "crypto-js";

export const LOCAL_KEYS_ENCRYPTION_KEY = process.env.LOCAL_KEYS_ENCRYPTION_KEY || '';
if (!LOCAL_KEYS_ENCRYPTION_KEY) {
  logger.fatal('You must set the LOCAL_KEYS_ENCRYPTION_KEY else every the local decryption key will unsecured in the DB!!!');
}

class UsersService {

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

  public async deleteUser(id: string) {
    logger.info(`[UsersService.deleteUser] About to get all users info ...`);
    await deleteUserData(id);
    logger.info(`[UsersService.deleteUser] Getting all users info succeed`);
  }

  public async getUserDecryptLocalKey(userId: string): Promise<string> {
    logger.info(`[UsersService.getUserDecryptLocalKey] About to get user "${userId}" decryptLocalKey ...`);
    const cipherDecryptLocalKey = await getUserDecryptLocalKeyData(userId);

    let decryptLocalKey = '';
    if (!cipherDecryptLocalKey) {
      decryptLocalKey = await this.regenerateUserDecryptLocalKey(userId);
    } else {
      // Decrypt the key
      const bytes = CryptoJS.AES.decrypt(cipherDecryptLocalKey, LOCAL_KEYS_ENCRYPTION_KEY);
      decryptLocalKey = bytes.toString(CryptoJS.enc.Utf8);;
    }

    logger.info(`[UsersService.getUserDecryptLocalKey] Getting user "${userId}" decryptLocalKey succeed`);
    return decryptLocalKey;
  }

  public async regenerateUserDecryptLocalKey(userId: string): Promise<string> {
    logger.info(`[UsersService.regenerateUserDecryptLocalKey] About to regenerate user "${userId}" decryptLocalKey ...`);
    const decryptLocalKey = uuid.v4();

    const cipherDecryptLocalKey = CryptoJS.AES.encrypt(decryptLocalKey, LOCAL_KEYS_ENCRYPTION_KEY).toString();
    // encrypt key before keeping it in DB 
    await setUserDecryptLocalKeyData(userId, cipherDecryptLocalKey);
    logger.info(`[UsersService.regenerateUserDecryptLocalKey] Regenerate user "${userId}" decryptLocalKey succeed`);
    return decryptLocalKey;
  }

  public async increaseUserPasswordVersionCodeName(userId: string): Promise<string> {
    logger.info(`[UsersService.increaseUserPasswordVersionCodeName] About to increase user "${userId}" passwordVersionCodeName ...`);
    const passwordVersionCodeName = uniqueNamesGenerator({ dictionaries: [colors, animals] });

    await setUserPasswordVersionCodeNameData(userId, passwordVersionCodeName);
    logger.info(`[UsersService.increaseUserPasswordVersionCodeName] Regenerate user "${userId}" passwordVersionCodeName succeed`);
    return passwordVersionCodeName;
  }

  public async increaseUseCertificateVersionCodeName(userId: string): Promise<string> {
    logger.info(`[UsersService.increaseUseCertificateVersionCodeName] About to increase user "${userId}" certificateVersionCodeName ...`);
    const certificateVersionCodeName = uniqueNamesGenerator({ dictionaries: [adjectives, animals] });

    await setUserCertificateVersionCodeNameData(userId, certificateVersionCodeName);
    logger.info(`[UsersService.increaseUseCertificateVersionCodeName] Regenerate user "${userId}" certificateVersionCodeName succeed`);
    return certificateVersionCodeName;
  }
}

export const usersService = new UsersService();
