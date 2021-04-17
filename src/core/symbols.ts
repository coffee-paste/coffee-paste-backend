import WebSocket from 'ws';

/**
 * Note status
 */
export enum NoteStatus {
    /** Note is open in the workspace */
    Workspace = 'WORKSPACE',
    /** Note closed and saved in backlog */
    Backlog = 'BACKLOG',
}

/**
 * The OAuth2 session
 */
export interface Auth {
    /** The session logon code, see https://docs.github.com/en/developers/apps/authorizing-oauth-apps */
    code: string;
}

/**
 * The verified (by JWT) user info
 */
export interface VerifiedUser {
    userId: string;
}

/**
 * Note update message structure
 */
export interface NoteUpdate {
    noteId: string;
    contentHTML: string;
}

/**
 * Incoming note update structure (including the plain text content)
 */
export interface IncomingNoteUpdate extends NoteUpdate {
    contentText: string;
}

// Define the express verified user extension
declare global {
    namespace Express {
        interface Request {
            user: VerifiedUser
        }
    }
}

// Extend the WS object
export class VerifiedWebSocket extends WebSocket {
    user: VerifiedUser;
    id: string;
}