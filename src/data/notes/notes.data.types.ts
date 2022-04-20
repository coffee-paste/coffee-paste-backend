import { Encryption } from '../../models/note.model';

export interface NoteUpdateRequest {
	oldGuardNonce?: string;
	newGuardNonce?: string;
}

export interface NoteContentUpdateParams {
	contentHTML: string;
	contentText: string;
}

export interface SetNoteEncryptionParams extends NoteUpdateRequest, NoteContentUpdateParams {
	encryption: Encryption;
}

export interface SetNoteContentParams extends NoteUpdateRequest, NoteContentUpdateParams {}
