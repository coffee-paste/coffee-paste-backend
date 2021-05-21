
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
export interface IncomingNoteUpdate extends NoteUpdate {
    contentText: string;
    contentHTML: string;
}


/**
 * Outgoing (from BE->FE) note update structure
 */
export interface OutgoingNoteUpdate extends NoteUpdate {
    event: NoteUpdateEvent;
    name?: string;
    contentHTML?: string;
}