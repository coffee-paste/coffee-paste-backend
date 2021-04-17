import { getMongoRepository, ObjectID } from "typeorm";
import { logger } from "../core";
import { Note, User } from "../models";

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
    const user = await usersRepository.findOneOrFail(userId);
    logger.info(`[users.data.getUserData] Fetch user "${userId}" info succeed`);
    // Update user workspace cache 
    userOpenNotesCache[userId] = user.openNotes;
    return user;
}

export async function getUsersData(): Promise<User[]> {
    logger.info(`[users.data.getUsersData] About to fetch all users info ...`);
    const usersRepository = getMongoRepository(User);
    const users = await usersRepository.find();
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

export async function createOrSetUserData(email: string, displayName: string, avatarBase64: string): Promise<string> {
    logger.info(`[users.data.createOrSetUser] About to set  "${email}" user ...`);
    const usersRepository = getMongoRepository(User);

    // Get the user info, if exist, by the email (even if the mail registered by other oauth provider the email is the user unique identity)
    const existUser = await usersRepository.findOne({
        where: {
            email,
        }
    })

    // If user info has been changed, update it.
    if (existUser) {
        if (existUser.displayName !== displayName || existUser.avatarBase64 !== avatarBase64) {
            logger.info(`[users.data.createOrSetUser] About to set  "${existUser.id}" "${email}" exists the name "${displayName}"...`);
            await usersRepository.update({ id: existUser.toObjectId() as any }, { displayName, avatarBase64 });
            logger.info(`[users.data.createOrSetUser] Setting  "${existUser.id}" "${email}" name "${displayName}" succeed`);
        }
        logger.info(`[users.data.createOrSetUser] User  "${existUser.id}" "${email}" exists`);
        // Update user workspace cache 
        userOpenNotesCache[existUser.id] = existUser.openNotes;
        return existUser.id;
    }

    logger.info(`[users.data.createOrSetUser] About to create a new user for "${email}" ...`);
    const user = new User(email, displayName, avatarBase64);
    const newUser = await usersRepository.save(user);

    // Set user workspace cache 
    userOpenNotesCache[newUser.id] = [];
    logger.info(`[users.data.createOrSetUser] Create user "${newUser.id}" for "${email}" successfully`);
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