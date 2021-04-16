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
