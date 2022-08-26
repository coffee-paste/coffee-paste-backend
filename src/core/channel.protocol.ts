import { SetNoteContentParams } from '../data/notes/notes.data.types';

export enum NoteUpdateEvent {
	/** New note to show in workspace event */
	NEW = 'NEW',
	/** Note property (not content) update */
	UPDATE = 'UPDATE',
	/** Remove note from the workspace event  */
	REMOVE = 'REMOVE',
	/** Note content update */
	FEED = 'FEED',
}

/**
 * Note update message structure
 */
export interface NoteUpdate {
	noteId: string;
}

/**
 * Incoming (from FE->BE) note update structure (including the plain text content)
 */
export interface FrontToBackNoteUpdate extends NoteUpdate, SetNoteContentParams {}

/**
 * Outgoing (from BE->FE) note update structure
 */
export interface BackToFrontNoteUpdate extends NoteUpdate {
	event: NoteUpdateEvent;
	name?: string;
	contentHTML?: string;
	encryption?: string;
}
