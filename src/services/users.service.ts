import { uniqueNamesGenerator, adjectives, colors, animals } from 'unique-names-generator';
import CryptoJS from 'crypto-js';
import { User } from '../models';
import {
	deleteNotesTagData,
	deleteUserData,
	deleteUserTagData,
	getUserData,
	getUserLocalStorageKeyEncryptionKeyData,
	getUserLocalStorageSaltData,
	getUsersData,
	setUserCertificateVersionCodeNameData,
	setUserLocalStorageKekData,
	setUserLocalStorageSaltData,
	setUserPasswordVersionCodeNameData,
} from '../data';
import { logger, randomBytesBase64Async } from '../core';

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

	public async getUserLocalStorageSalt(userId: string): Promise<string> {
		logger.info(`[UsersService.getUserLocalStorageSalt] About to get user "${userId}" localStorageSalt ...`);
		const cipherLocalStorageSalt = await getUserLocalStorageSaltData(userId);

		let localStorageSalt = '';
		if (!cipherLocalStorageSalt) {
			localStorageSalt = await this.regenerateUserLocalStorageSalt(userId);
		} else {
			// Decrypt the key
			const bytes = CryptoJS.AES.decrypt(cipherLocalStorageSalt, LOCAL_KEYS_ENCRYPTION_KEY);
			localStorageSalt = bytes.toString(CryptoJS.enc.Utf8);
		}

		logger.info(`[UsersService.getUserLocalStorageSalt] Getting user "${userId}" localStorageSalt succeed`);
		return localStorageSalt;
	}

	public async getUserLocalStorageKeyEncryptionKey(userId: string): Promise<string> {
		logger.info(`[UsersService.getUserLocalStorageKeyEncryptionKey] About to get user "${userId}" localStorageKek ...`);
		const kek = await getUserLocalStorageKeyEncryptionKeyData(userId);

		let localStorageKek = '';
		if (!kek) {
			localStorageKek = await this.regenerateUserLocalStorageKeyEncryptionKey(userId);
		} else {
			// Decrypt the key
			const bytes = CryptoJS.AES.decrypt(kek, LOCAL_KEYS_ENCRYPTION_KEY);
			localStorageKek = bytes.toString(CryptoJS.enc.Utf8);
		}

		logger.info(`[UsersService.getUserLocalStorageKeyEncryptionKey] Getting user "${userId}" localStorageKek succeed`);
		return localStorageKek;
	}

	public async regenerateUserLocalStorageSalt(userId: string): Promise<string> {
		logger.info(`[UsersService.regenerateUserLocalStorageSalt] About to regenerate user "${userId}" localStorageSalt ...`);
		const localStorageSalt = await randomBytesBase64Async(32);

		// encrypt key before keeping it in DB
		const cipherLocalStorageSalt = CryptoJS.AES.encrypt(localStorageSalt, LOCAL_KEYS_ENCRYPTION_KEY).toString();
		await setUserLocalStorageSaltData(userId, cipherLocalStorageSalt);
		logger.info(`[UsersService.regenerateUserLocalStorageSalt] Regenerate user "${userId}" localStorageSalt succeed`);
		return localStorageSalt;
	}

	public async regenerateUserLocalStorageKeyEncryptionKey(userId: string): Promise<string> {
		logger.info(`[UsersService.regenerateUserLocalStorageKeyEncryptionKey] About to regenerate user "${userId}" localStorageKek ...`);
		const kek = await randomBytesBase64Async(32); // TODO: This should be an exported const (like channel spec)

		// encrypt key before keeping it in DB
		const encryptedKek = CryptoJS.AES.encrypt(kek, LOCAL_KEYS_ENCRYPTION_KEY).toString();
		await setUserLocalStorageKekData(userId, encryptedKek);
		logger.info(`[UsersService.regenerateUserLocalStorageKeyEncryptionKey] Regenerate user "${userId}" localStorageKek succeed`);
		return kek;
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

	public async deleteUserTag(userId: string, tag: string): Promise<void> {
		logger.info(`[UsersService.deleteUserTag] About to delete user "${userId}" tag ${tag} ...`);
		await deleteUserTagData(userId, tag);
		logger.info(`[UsersService.deleteUserTag] Delete user "${userId}" tag ${tag} succeed`);

		logger.info(`[UsersService.deleteUserTag] About to delete user "${userId}" tag ${tag} from all user notes ...`);
		await deleteNotesTagData(userId, tag);
		logger.info(`[UsersService.deleteUserTag] Delete user "${userId}" tag ${tag} from all user notes succeed`);
	}
}

export const usersService = new UsersService();
