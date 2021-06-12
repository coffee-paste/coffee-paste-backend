import { getMongoRepository, ObjectID } from "typeorm";
import { logger } from "../core";
import { Note, User } from "../models";
import * as mongodb from "mongodb";

/**
 * Hold last known open-notes cache map by userId.
 * USed to avoid request for user info before updating workspace only notes 
 */
const userOpenNotesCache: {
    [key: string]: string[]
} = {};

export async function getUserData(userId: string): Promise<User> {
    logger.info(`[users.data.getUserData] About to fetch user "${userId}" info ...`);
    const usersRepository = getMongoRepository(User);
    const user = await usersRepository.findOneOrFail(({
        where: {
            _id: new mongodb.ObjectID(userId) as any,
        },
        select : [ 'id', 'displayName', 'email', 'openNotes', 'avatarBase64', 'passwordVersionCodeName', 'certificateVersionCodeName' ]
    }));
    logger.info(`[users.data.getUserData] Fetch user "${userId}" info succeed`);
    // Update user workspace cache 
    userOpenNotesCache[userId] = user.openNotes;
    return user;
}

export async function getUserLocalStorageSaltData(userId: string): Promise<string | undefined> {
    logger.info(`[users.data.getUserLocalStorageSaltData] About to fetch user "${userId}" localStorageSalt ...`);
    const usersRepository = getMongoRepository(User);
    const user = await usersRepository.findOneOrFail(({
        where: {
            _id: new mongodb.ObjectID(userId) as any,
        },
        select : [ 'localStorageSalt' ]
    }));
    logger.info(`[users.data.getUserLocalStorageSaltData] Fetch user "${userId}" localStorageSalt succeed`);
   
    return user.localStorageSalt;
}

export async function setUserLocalStorageSaltData(userId: string, localStorageSalt: string) {
    logger.info(`[users.data.setUserLocalStorageSaltData] About to set user "${userId}" localStorageSalt ...`);
    const usersRepository = getMongoRepository(User);
    await usersRepository.update({ id: new mongodb.ObjectID(userId) as any }, { localStorageSalt });

    logger.info(`[users.data.setUserLocalStorageSaltData] Set user "${userId}" localStorageSalt succeed`);
}

export async function getUserPasswordVersionCodeNameData(userId: string): Promise<string | undefined> {
    logger.info(`[users.data.getUserPasswordVersionCodeNameData] About to fetch user "${userId}" passwordVersionCodeName ...`);
    const usersRepository = getMongoRepository(User);
    const user = await usersRepository.findOneOrFail(({
        where: {
            _id: new mongodb.ObjectID(userId) as any,
        },
        select : [ 'passwordVersionCodeName' ]
    }));
    logger.info(`[users.data.getUserPasswordVersionCodeNameData] Fetch user "${userId}" passwordVersionCodeName succeed`);
   
    return user.passwordVersionCodeName;
}

export async function getUserCertificateVersionCodeNameData(userId: string): Promise<string | undefined> {
    logger.info(`[users.data.getUserCertificateVersionCodeNameData] About to fetch user "${userId}" certificateVersionCodeName ...`);
    const usersRepository = getMongoRepository(User);
    const user = await usersRepository.findOneOrFail(({
        where: {
            _id: new mongodb.ObjectID(userId) as any,
        },
        select : [ 'certificateVersionCodeName' ]
    }));
    logger.info(`[users.data.getUserCertificateVersionCodeNameData] Fetch user "${userId}" certificateVersionCodeName succeed`);
   
    return user.certificateVersionCodeName;
}

export async function setUserPasswordVersionCodeNameData(userId: string, passwordVersionCodeName: string) {
    logger.info(`[users.data.setUserPasswordVersionCodeNameData] About to set user "${userId}" passwordVersionCodeName ...`);
    const usersRepository = getMongoRepository(User);
    await usersRepository.update({ id: new mongodb.ObjectID(userId) as any }, { passwordVersionCodeName });

    logger.info(`[users.data.setUserPasswordVersionCodeNameData] Set user "${userId}" passwordVersionCodeName succeed`);
}

export async function setUserCertificateVersionCodeNameData(userId: string, certificateVersionCodeName: string) {
    logger.info(`[users.data.setUserCertificateVersionCodeNameData] About to set user "${userId}" certificateVersionCodeName ...`);
    const usersRepository = getMongoRepository(User);
    await usersRepository.update({ id: new mongodb.ObjectID(userId) as any }, { certificateVersionCodeName });

    logger.info(`[users.data.setUserCertificateVersionCodeNameData] Set user "${userId}" certificateVersionCodeName succeed`);
}

export async function getUsersData(): Promise<User[]> {
    logger.info(`[users.data.getUsersData] About to fetch all users info ...`);
    const usersRepository = getMongoRepository(User);
    const users = await usersRepository.find({
        select : [ 'id', 'displayName', 'email', 'openNotes', 'uniqueOAuthId', 'passwordVersionCodeName', 'certificateVersionCodeName' ]
    });
    logger.info(`[users.data.getUsersData] Fetch all users info succeed`);
    return users;
}

export async function addNoteToUserOpenNotesData(userId: string, noteId: string) {
    logger.info(`[users.data.addNoteToUserOpenNotesData] About to set note "${noteId}" as open note for user "${userId}"...`);
    // First, get user info
    const user = await getUserData(userId);

    // If the note already in the list, abort
    if (user.openNotes?.find(n => n === noteId)) {
        return;
    }

    // If the list is undefined, set it as empty collection
    if (!user.openNotes) {
        user.openNotes = [];
    }

    // Add the note
    user.openNotes.push(noteId);
    const usersRepository = getMongoRepository(User);
    // Save change
    await usersRepository.update({ id: user.toObjectId() as any }, { openNotes: user.toOpenNoteObjectIDs() as any[] });
    // Update user workspace cache 
    userOpenNotesCache[userId] = user.openNotes;
    logger.info(`[users.data.addNoteToUserOpenNotesData] Setting note "${noteId}" as open note for user "${userId}" succeed`);
}

export async function removeNoteFromUserOpenNotesData(userId: string, noteId: string) {
    logger.info(`[users.data.removeNoteFromUserOpenNotesData] About to remove note "${noteId}" from the open note of user "${userId}"...`);

    // First get user info
    const user = await getUserData(userId);

    // If the open notes collection is not defined, abort
    if (!user.openNotes) {
        return;
    }

    // Get the current note index in the notes collection
    const noteIndexInOpenNotes = user.openNotes.findIndex(n => n === noteId);

    // If the note not exists, abort.
    if (noteIndexInOpenNotes === -1) {
        return;
    }

    // Remove the note from the collection
    user.openNotes.splice(noteIndexInOpenNotes, 1);
    const usersRepository = getMongoRepository(User);

    // Save change
    await usersRepository.update({ id: user.toObjectId() as any }, { openNotes: user.toOpenNoteObjectIDs() as any[] });
    // Update user workspace cache 
    userOpenNotesCache[userId] = user.openNotes;
    logger.info(`[users.data.removeNoteFromUserOpenNotesData] Remove note "${noteId}" from the open note of user "${userId}" succeed`);
}

export async function createOrSetUserData(uniqueOAuthId: string, email: string, displayName: string, avatarBase64: string): Promise<string> {
    logger.info(`[users.data.createOrSetUser] About to set "${uniqueOAuthId}" user ...`);
    const usersRepository = getMongoRepository(User);

    // Get the user info, if exist, by the email (even if the mail registered by other oauth provider the email is the user unique identity)
    let existsUser = await usersRepository.findOne({
        where: {
            email,
        }
    })

    // Verbose info about user found by email
    if (existsUser) {
        logger.info(`[users.data.createOrSetUser] User "${uniqueOAuthId}" already exists, found by email...`);
    }

    if (!existsUser) {
        existsUser = await usersRepository.findOne({
            where: {
                uniqueOAuthId,
            }
        });
        // Verbose info about user found by uniqueOAuthId
        if (existsUser) {
            logger.info(`[users.data.createOrSetUser] User "${uniqueOAuthId}" already exists, found by uniqueOAuthId ${uniqueOAuthId} ...`);
        }
    }

    // If user info has been changed, update it.
    if (existsUser) {
        if (existsUser.displayName !== displayName || existsUser.avatarBase64 !== avatarBase64) {
            logger.info(`[users.data.createOrSetUser] About to set  "${existsUser.id}" "${uniqueOAuthId}" exists the name "${displayName}"...`);
            await usersRepository.update({ id: existsUser.toObjectId() as any }, { displayName, avatarBase64 });
            logger.info(`[users.data.createOrSetUser] Setting  "${existsUser.id}" "${email}" name "${displayName}" succeed`);
        }
        logger.info(`[users.data.createOrSetUser] User  "${existsUser.id}" "${uniqueOAuthId}" exists`);
        // Update user workspace cache 
        userOpenNotesCache[existsUser.id] = existsUser.openNotes;
        return existsUser.id;
    }

    logger.info(`[users.data.createOrSetUser] About to create a new user for "${uniqueOAuthId}" ...`);
    const user = new User(uniqueOAuthId, email, displayName, avatarBase64);
    const newUser = await usersRepository.save(user);

    // Set user workspace cache 
    userOpenNotesCache[newUser.id] = [];
    logger.info(`[users.data.createOrSetUser] Create user "${newUser.id}" for "${uniqueOAuthId}" successfully`);
    return newUser.id;
}

/**
 * Remove user from the system, include all his info. 
 * @param userId 
 */
export async function deleteUserData(userId: string) {
    logger.info(`[users.data.deleteUserData] About to remove all user "${userId}" data from system ...`);

    // Clean the workspace cache data
    delete userOpenNotesCache[userId];

    const usersRepository = getMongoRepository(User);
    // First get user object
    const user = await getUserData(userId);

    const notesRepository = getMongoRepository(Note);
    logger.info(`[users.data.deleteUserData] About to fetch & delete user "${userId}" notes ...`);
    const notes = await notesRepository.find({
        where: {
            userId: user.toObjectId(),
        }
    });
    await notesRepository.remove(notes);
    logger.info(`[users.data.deleteUserData] Delete user "${userId}" notes succeed`);

    logger.info(`[users.data.deleteUserData] About to delete user "${userId}" ...`);
    await usersRepository.remove(user);
    logger.info(`[users.data.deleteUserData] Delete user "${userId}" succeed`);
}

export async function getOpenNotesLazyData(userId: string): Promise<string[]> {
    logger.info(`[users.data.getOpenNotesLazyData] Looking for "${userId}" open notes...`);
    if (userId in userOpenNotesCache) {
        logger.info(`[users.data.getOpenNotesLazyData] "${userId}" open notes cached, returning saved cache`);
        return userOpenNotesCache[userId];
    }
    const user = await getUserData(userId);
    const openNotes = userOpenNotesCache[userId] = user.openNotes;
    logger.info(`[users.data.getOpenNotesLazyData] Loading "${userId}" current open notes done, and cached`);
    return openNotes;
}