import { getMongoRepository, ObjectID } from "typeorm";
import { logger } from "../core";
import { User } from "../models";

export async function getUserData(id: string): Promise<User> {
    logger.info(`[users.data.getUserData] About to fetch user "${id}" info ...`);
    const usersRepository = getMongoRepository(User);
    const user = await usersRepository.findOneOrFail(id, {
        // Do not fetch 'oauthInfo'
        select: ['id', 'displayName', 'openNotes']
    });
    logger.info(`[users.data.getUserData] Fetch user "${id}" info succeed`);
    return user;
}

export async function getUsersData(): Promise<User[]> {
    logger.info(`[users.data.getUsersData] About to fetch all users info ...`);
    const usersRepository = getMongoRepository(User);
    const users = await usersRepository.find({
        // Do not fetch 'oauthInfo'
        select: ['id', 'displayName', 'openNotes']
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

