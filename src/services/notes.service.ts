import { Note, User } from "../models";
import { createNoteData, getBacklogNotesData, getOpenNotesData, removeNoteFromUserOpenNotesData, addNoteToUserOpenNotesData, deleteNoteData, setNoteContentData, setOpenNoteContentData } from "../data";
import { logger, notesContentUpdateDebounce, NoteStatus } from "../core";

class NotesService {

  public async getWorkspaceNotes(userId: string): Promise<Note[]> {
    logger.info(`[NotesService.getOpenNotes] About to get all user "${userId}" workspace notes ...`);
    const notes = await getOpenNotesData(userId);
    // If update arrived from client but not flush yet to the DB, update the workspace notes
    for (const note of notes) {
      const  notesUpdateDebounceInfo = notesContentUpdateDebounce.get(note.id);
      note.contentHTML = notesUpdateDebounceInfo?.lastState?.contentHTML || note.contentHTML;
      note.contentText = notesUpdateDebounceInfo?.lastState?.contentText || note.contentText;
    }
    logger.info(`[NotesService.getOpenNotes] Getting all user "${userId}" workspace notes succeed`);
    return notes;
  }

  public async getBacklogNotes(userId: string): Promise<Note[]> {
    logger.info(`[NotesService.getBacklogNotes] About to get all user "${userId}" backlog notes ...`);
    const notes = await getBacklogNotesData(userId);
    logger.info(`[NotesService.getBacklogNotes] Getting all user "${userId}" backlog notes succeed`);
    return notes;
  }

  public async createNote(userId: string): Promise<string> {
    logger.info(`[NotesService.createNote] About to create a new note for user "${userId}"...`);
    const noteId = await createNoteData(userId);
    logger.info(`[NotesService.createNote] Create a new note for user "${userId}" succeed`);
    return noteId;
  }

  public async setNoteStatus(noteId: string, status: NoteStatus, userId: string) {
    logger.info(`[NotesService.setNoteStatus] About to set note "${noteId}" of user "${userId}" statue "${status}"...`);
    switch (status) {
      case NoteStatus.Workspace:
        await addNoteToUserOpenNotesData(userId, noteId);
        break;
      case NoteStatus.Backlog:
        await removeNoteFromUserOpenNotesData(userId, noteId);
        break;
    }
    logger.info(`[NotesService.setNoteStatus] Setting note "${noteId}" of user "${userId}" statue "${status}" succeed`);
  }

  public async deleteNotes(noteId: string, userId: string) {
    logger.info(`[NotesService.deleteNotes] About to delete note "${noteId}" of user "${userId}"`);
    await deleteNoteData(noteId, userId);
    logger.info(`[NotesService.deleteNotes] Deleting note "${noteId}" of user "${userId}" succeed`);
  }

  public async setOpenNoteContent(noteId: string, userId: string, contentText: string, contentHTML: string) {
    logger.info(`[NotesService.setOpenNoteContent] About to set note "${noteId}" a new content...`);
    await setOpenNoteContentData(noteId, userId, contentText, contentHTML);
    logger.info(`[NotesService.setOpenNoteContent] Setting note "${noteId}" a new content succeed`);
  }

  public async setNoteContent(noteId: string, userId: string, contentText: string, contentHTML: string) {
    logger.info(`[NotesService.setNoteContent] About to set note "${noteId}" a new content...`);
    await setNoteContentData(noteId, userId, contentText, contentHTML);
    logger.info(`[NotesService.setNoteContent] Setting note "${noteId}" a new content succeed`);
  }
}

export const notesService = new NotesService();