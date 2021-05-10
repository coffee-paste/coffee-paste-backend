import WebSocket from 'ws';
import { Note } from '../models';

/**
 * Note status
 */
export enum NoteStatus {
    /** Note is open in the workspace */
    Workspace = 'WORKSPACE',
    /** Note closed and saved in backlog */
    Backlog = 'BACKLOG',
}

export enum OAuth2Service {
    GitHub = 'GITHUB',
    Google = 'GOOGLE',
    GitLab = 'GITLAB',
}

/**
 * The OAuth2 session
 */
export interface OAuth2Session {
    /** The session logon code, see https://docs.github.com/en/developers/apps/authorizing-oauth-apps & https://developers.google.com/identity/protocols/oauth2/web-server */
    code: string;
    redirectUri: string;
    oauth2Service: OAuth2Service;
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

export type MatchOperators = 'startWith' | 'contains' | 'notContains' | 'endWith' | 'equals' | 'notEquals';

export type RelationOperators = 'equals' | 'notEquals' | 'less' | 'lessOrEquals' | 'greater' | 'greaterOrEquals';

export type CollectionOperators = 'inCollection' | 'notInCollection';

export interface FilterOptions {
    match?: {
        value: string;
        matchOperator: MatchOperators;
    },
    range?: {
        from: number;
        to: number;
    },
    relation?: {
        value: number;
        relationOperator: RelationOperators;
    },
    collection?: {
        values: (string | number)[];
        collectionOperator: CollectionOperators;
    }
}

export type QueryableFields = 'name' | 'creationTime' | 'lastModifiedTime' | 'contentText';

export interface PageRequest {
    /** Order by note fields */
    orderBy?: { [field in QueryableFields]?: "ASC" | "DESC" },
    fromIndex: number;
    pageSize: number;
    filter?: {
        /** Filter by any note fields */
        [field in QueryableFields]?: FilterOptions;
    }
}

export interface NotesPage {
    /** Page notes */
    notes: Note[];
    /** Total *available* notes */
    totalCount: number;
}