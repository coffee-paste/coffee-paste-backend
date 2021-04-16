import { getMongoRepository, ObjectID } from "typeorm";
import { logger } from "../core";
import { Note, User } from "../models";

export async function getUserData(id: string): Promise<User> {
    logger.info(`[users.data.getUserData] About to fetch user "${id}" info ...`);
    const usersRepository = getMongoRepository(User);
    const user = await usersRepository.findOneOrFail(id);
    logger.info(`[users.data.getUserData] Fetch user "${id}" info succeed`);
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
    logger.info(`[users.data.removeNoteFromUserOpenNotesData] Remove note "${noteId}" from the open note of user "${userId}" succeed`);
}

export async function createOrSetUserData(email: string, displayName: string): Promise<string> {
    logger.info(`[users.data.createOrSetUser] About to set  "${email}" user ...`);
    const usersRepository = getMongoRepository(User);

    const existUser = await usersRepository.findOne({
        where: {
            email,
        }
    })

    if (existUser) {
        if (existUser.displayName !== displayName) {
            logger.info(`[users.data.createOrSetUser] About to set  "${existUser.id}" "${email}" exists the name "${displayName}"...`);
            await usersRepository.update({ id: existUser.toObjectId() as any }, { displayName });
            logger.info(`[users.data.createOrSetUser] Setting  "${existUser.id}" "${email}" name "${displayName}" succeed`);
        }
        logger.info(`[users.data.createOrSetUser] User  "${existUser.id}" "${email}" exists`);
        return existUser.id;
    }

    logger.info(`[users.data.createOrSetUser] About to create a new user for "${email}" ...`);
    const user = new User(email, displayName);
    const newUser = await usersRepository.save(user);
    logger.info(`[users.data.createOrSetUser] Create user "${newUser.id}" for "${email}" successfully`);
    return newUser.id;
}

/**
 * Remove user from the system, include all his info. 
 * @param userId 
 */
export async function deleteUserData(userId: string) {
    logger.info(`[users.data.deleteUserData] About to remove all user "${userId}" data from system ...`);
   
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