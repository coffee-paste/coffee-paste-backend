import { Encryption, Note, User } from "../models";
import { createNoteData, getBacklogNotesData, getOpenNotesData, removeNoteFromUserOpenNotesData, addNoteToUserOpenNotesData, deleteNoteData, setNoteContentData, setOpenNoteContentData, setNoteNameData, getNotesPageData, getNoteData, setNoteEncryptionMethodData, setNoteTagsData, getUserData, setUserTagsData } from "../data";
import { FetchPageOptions, logger, notesContentUpdateDebounce, NotesPage, NoteStatus, PageRequest } from "../core";

class NotesService {

  private loadDebounceContent(note: Note) {
    const notesUpdateDebounceInfo = notesContentUpdateDebounce.get(note.id);
    note.contentHTML = notesUpdateDebounceInfo?.lastState?.contentHTML ?? note.contentHTML;
    note.contentText = notesUpdateDebounceInfo?.lastState?.contentText ?? note.contentText;
  }

  public async getNote(noteId: string, userId: string): Promise<Note> {
    logger.info(`[NotesService.getNote] About to fetch note "${noteId}" backlog notes ...`);
    const note = await getNoteData(noteId, userId);
    this.loadDebounceContent(note);
    logger.info(`[NotesService.getNote]Fetch note "${noteId}" succeed`);
    return note;
  }

  public async getWorkspaceNotes(userId: string): Promise<Note[]> {
    logger.info(`[NotesService.getOpenNotes] About to get all user "${userId}" workspace notes ...`);
    const notes = await getOpenNotesData(userId);
    // If update arrived from client but not flush yet to the DB, update the workspace notes
    for (const note of notes) {
      this.loadDebounceContent(note);
    }
    logger.info(`[NotesService.getOpenNotes] Getting all user "${userId}" workspace notes succeed`);
    return notes;
  }

  public async getBacklogNotes(userId: string): Promise<Note[]> {
    logger.info(`[NotesService.getBacklogNotes] About to get all user "${userId}" backlog notes ...`);
    const notes = await getBacklogNotesData(userId);
    for (const note of notes) {
      this.loadDebounceContent(note);
    }
    logger.info(`[NotesService.getBacklogNotes] Getting all user "${userId}" backlog notes succeed`);
    return notes;
  }

  public async getNotesPage(userId: string, page: PageRequest, fetchPageNotes: FetchPageOptions): Promise<NotesPage> {
    logger.info(`[NotesService.getBacklogNotesPage] About to get all user "${userId}" backlog notes ...`);
    const notes = await getNotesPageData(userId, page, fetchPageNotes);
    logger.info(`[NotesService.getBacklogNotesPage] Getting all user "${userId}" backlog notes succeed`);
    return notes;
  }

  public async createNote(userId: string, name?: string): Promise<string> {
    logger.info(`[NotesService.createNote] About to create a new note for user "${userId}"...`);
    const noteId = await createNoteData(userId, name);
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

  public async setNoteName(noteId: string, userId: string, name: string) {
    logger.info(`[NotesService.setNoteContent] About to set note "${noteId}" a new content...`);
    await setNoteNameData(noteId, userId, name);
    logger.info(`[NotesService.setNoteContent] Setting note "${noteId}" a new content succeed`);
  }

  public async setNoteEncryptionMethod(noteId: string, userId: string, contentHTML: string, contentText: string, encryption: Encryption) {
    logger.info(`[NotesService.setNoteContent] About to set note "${noteId}" a new content...`);
    await setNoteEncryptionMethodData(noteId, userId, contentHTML, contentText, encryption);
    logger.info(`[NotesService.setNoteContent] Setting note "${noteId}" a new content succeed`);
  }

  public async setNoteTags(noteId: string, userId: string, tags: string[]) {
    logger.info(`[NotesService.setNoteTags] About to set note "${noteId}" tags ...`);

    // Before setting the tags to the note, make sure to update user's tags collection with all new tags, in any.

    // Get the current collection first, then compare it to the new note tag, to find some new tags.
    const userTagsCollection = (await getUserData(userId)).tags;
    const newUserTags = tags.filter((userTag) => !userTagsCollection.includes(userTag));
    if (newUserTags.length > 0) {
      logger.info(`[NotesService.setNoteTags] About to add new tags to the user ${userId} collection ...`);
      userTagsCollection.push(...newUserTags);
      await setUserTagsData(userId, userTagsCollection);
      logger.info(`[NotesService.setNoteTags] Adding new tags to the user ${userId} collection succeed`);
    }

    await setNoteTagsData(noteId, userId, tags);
    logger.info(`[NotesService.setNoteTags] Setting note "${noteId}" tags succeed`);
  }
}

export const notesService = new NotesService();