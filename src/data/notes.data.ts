import { FindConditions, getMongoRepository, ObjectLiteral } from 'typeorm';
import * as mongodb from 'mongodb';
import { FetchPageOptions, FilterOptions, logger, NotesPage, PageRequest, QueryableFields, randomBytesBase64Async } from '../core';
import { Encryption, Note } from '../models';
import {
	getUserData,
	removeNoteFromUserOpenNotesData,
	addNoteToUserOpenNotesData,
	getOpenNotesLazyData,
	getUserPasswordVersionCodeNameData,
	getUserCertificateVersionCodeNameData,
} from './users.data';
import { collectionOperatorsToMongoOperator, matchOperatorToMongoExpression, relationOperatorToMongoOperator } from './utilities.data';

export async function getNoteData(noteId: string, userId: string): Promise<Note> {
	logger.info(`[notes.data.getNoteData] About to fetch note id "${noteId}"...`);
	const notesRepository = getMongoRepository(Note);
	const notes = await notesRepository.findOneOrFail({
		where: {
			_id: new mongodb.ObjectID(noteId) as any,
			userId: new mongodb.ObjectID(userId) as any,
		},
	});
	logger.info(`[notes.data.getNoteData] Fetch note id "${noteId}" succeed`);
	return notes;
}

export async function getOpenNotesData(userId: string): Promise<Note[]> {
	logger.info(`[notes.data.getOpenNotesData] About to fetch all workspace notes for user "${userId}"...`);
	// In order to fetch only notes that in the user open notes, fetch the user info first
	const user = await getUserData(userId);
	const notesRepository = getMongoRepository(Note);
	const notes = await notesRepository.find({
		where: {
			userId: user.toObjectId(),
			_id: {
				$in: user.toOpenNoteObjectIDs(),
			},
		},
		order: {
			creationTime: 'ASC',
		},
	});
	logger.info(`[notes.data.getOpenNotesData] Fetch workspace notes (${notes.length}) for user "${userId}" succeed`);
	return notes;
}

export async function getBacklogNotesData(userId: string): Promise<Note[]> {
	logger.info(`[notes.data.getBacklogNotesData] About to fetch all backlog notes for user "${userId}"...`);
	// In order to fetch only notes that *not* in the user open notes, fetch the user info first
	const user = await getUserData(userId);
	const notesRepository = getMongoRepository(Note);
	const notes = await notesRepository.find({
		where: {
			userId: user.toObjectId(),
			_id: {
				$nin: user.toOpenNoteObjectIDs(),
			},
		},
		order: {
			lastModifiedTime: 'DESC',
		},
	});
	logger.info(`[notes.data.getBacklogNotesData] Fetch backlog notes (${notes?.length}) for user "${userId}" succeed`);
	return notes;
}

export async function getNotesPageData(userId: string, page: PageRequest, fetchPageNotes: FetchPageOptions): Promise<NotesPage> {
	logger.info(`[notes.data.getBacklogNotesPageData] About to fetch all backlog page "${JSON.stringify(page)}" notes for user "${userId}" ...`);
	const notesRepository = getMongoRepository(Note);

	// Do not query content if not necessary
	const select: (keyof Note)[] = ['id', 'name', 'creationTime', 'lastModifiedTime', 'tags'];
	if (page.filter?.contentText) {
		select.push('contentText');
	}

	// Create the initial filter, with the notes to show to the current available in the user archive/backlog
	const where: ObjectLiteral | FindConditions<Note> | any = {
		userId: new mongodb.ObjectID(userId) as any,
	};

	if (fetchPageNotes !== 'all') {
		// In order to fetch only notes that in/not in in the user open notes, fetch the user info first
		const user = await getUserData(userId);
		// eslint-disable-next-line no-underscore-dangle
		where._id = {
			[collectionOperatorsToMongoOperator(fetchPageNotes === 'workspace' ? 'inCollection' : 'notInCollection')]: user.toOpenNoteObjectIDs(),
		};
	}

	// Iterate on the notes properties (if exists) with their filter
	for (const [field, filter] of Object.entries(page.filter || {}) as [QueryableFields, FilterOptions][]) {
		if (filter.match) {
			// Create the property match filter
			where[field] = matchOperatorToMongoExpression(filter.match.matchOperator, filter.match.value);
		}

		if (filter.relation) {
			where[field] = where[field] || {};
			const operatorKey = relationOperatorToMongoOperator(filter.relation.relationOperator);
			// Append the property relation filter
			where[field][operatorKey] = filter.relation.value;
		}

		if (filter.collection) {
			where[field] = where[field] || {};
			const operatorKey = collectionOperatorsToMongoOperator(filter.collection.collectionOperator);
			// Append the property collection filter
			where[field][operatorKey] = filter.collection.values;
		}

		if (filter.range) {
			const operatorLess = relationOperatorToMongoOperator('lessOrEquals');
			const operatorGreater = relationOperatorToMongoOperator('greaterOrEquals');
			// Append the property range filter
			where[field] = where[field] || {};
			where[field][operatorGreater] = filter.range.from;
			where[field][operatorLess] = filter.range.to;
		}

		if (filter.outRange) {
			const operatorLess = relationOperatorToMongoOperator('lessOrEquals');
			const operatorGreater = relationOperatorToMongoOperator('greaterOrEquals');
			// Append the property out range filter
			where[field] = where[field] || {};

			where[field].$not = {};
			where[field].$not[operatorGreater] = filter.outRange.from;
			where[field].$not[operatorLess] = filter.outRange.to;
		}
	}

	const [notes, totalCount] = await notesRepository.findAndCount({
		select,
		where,
		order: page.orderBy || {},
		skip: page.fromIndex,
		take: page.pageSize,
	});
	logger.info(`[notes.data.getBacklogNotesPageData] Fetch backlog notes (${notes?.length}) for user "${userId}" succeed`);
	return {
		notes,
		totalCount,
	};
}

export async function createNoteData(userId: string, name?: string): Promise<string> {
	logger.info(`[notes.data.createNoteData] About to create a new note for user "${userId}"...`);

	// Generate note unique key for further encryption
	const randomNoteSalt = await randomBytesBase64Async(64);

	const note = new Note(userId, randomNoteSalt, name);
	const notesRepository = getMongoRepository(Note);
	const createdNote = await notesRepository.save(note);
	try {
		// Auto set new note as a workspace note
		await addNoteToUserOpenNotesData(userId, createdNote.id);
	} catch (error) {
		logger.error(`[notes.data.createNoteData] setting note id "${createdNote.id}" as open note for user "${userId}" failed`);
		// DELETE NOTE IN CASE OF FAILURE
		throw error;
	}
	logger.info(`[notes.data.createNoteData] Create a new note id "${createdNote.id}" for user "${userId}" succeed`);
	return createdNote.id;
}

export async function deleteNoteData(noteId: string, userId: string) {
	logger.info(`[notes.data.deleteNoteData] About to delete the note "${noteId}" of user "${userId}"...`);
	const notesRepository = getMongoRepository(Note);
	await notesRepository.delete(noteId);
	try {
		// After removing note, make sure to remove it for the user workspace too
		await removeNoteFromUserOpenNotesData(userId, noteId);
	} catch (error) {
		logger.error(`[notes.data.deleteNoteData] removing note id "${noteId}" from been open note for user "${userId}" failed`);
		// DELETE NOTE IN CASE OF FAILURE
		throw error;
	}
	logger.info(`[notes.data.deleteNoteData] Delete the note "${noteId}" of user "${userId}" succeed`);
}

export async function setOpenNoteContentData(noteId: string, userId: string, contentText: string, contentHTML: string) {
	logger.info(`[notes.data.setOpenNoteContentData] About to update the note "${noteId}" content ...`);

	const openNotes = await getOpenNotesLazyData(userId);

	if (!openNotes?.includes(noteId)) {
		throw new Error(`note "${noteId}" isn't in the user "${userId}" workspace`);
	}

	const notesRepository = getMongoRepository(Note);
	await notesRepository.update(
		{ id: new mongodb.ObjectID(noteId) as any },
		{
			contentHTML,
			contentText,
			lastModifiedTime: new Date().getTime(),
		}
	);
	logger.info(`[notes.data.setOpenNoteContentData] Update the note "${noteId}" content succeed`);
}

export async function setNoteContentData(noteId: string, userId: string, contentText: string, contentHTML: string) {
	logger.info(`[notes.data.setNoteContentData] About to update the note "${noteId}" content ...`);

	const notesRepository = getMongoRepository(Note);
	await notesRepository.update(
		{
			id: new mongodb.ObjectID(noteId) as any,
			userId: new mongodb.ObjectID(userId) as any,
		},
		{
			contentHTML,
			contentText,
			lastModifiedTime: new Date().getTime(),
		}
	);
	logger.info(`[notes.data.setNoteContentData] update the note "${noteId}" content succeed`);
}

export async function setNoteNameData(noteId: string, userId: string, name: string) {
	logger.info(`[notes.data.setNoteNameData] About to update the note "${noteId}" name ...`);

	const notesRepository = getMongoRepository(Note);
	await notesRepository.update(
		{
			id: new mongodb.ObjectID(noteId) as any,
			userId: new mongodb.ObjectID(userId) as any,
		},
		{
			name,
		}
	);
	logger.info(`[notes.data.setNoteNameData] Update the note "${noteId}" name succeed`);
}

export async function setNoteEncryptionMethodData(noteId: string, userId: string, contentHTML: string, contentText: string, encryption: Encryption) {
	logger.info(`[notes.data.setNoteEncryptionMethodData] About to update the note "${noteId}" encryption method ...`);

	let passwordVersionCodeName: string | undefined;
	let certificateVersionCodeName: string | undefined;

	// While setting to the new encryption method, update the encryption versions too
	switch (encryption) {
		case Encryption.Password:
			passwordVersionCodeName = await getUserPasswordVersionCodeNameData(userId);
			certificateVersionCodeName = '';
			break;
		case Encryption.Certificate:
			certificateVersionCodeName = await getUserCertificateVersionCodeNameData(userId);
			passwordVersionCodeName = '';
			break;
		case Encryption.None:
		default:
			passwordVersionCodeName = '';
			certificateVersionCodeName = '';
			break;
	}

	const notesRepository = getMongoRepository(Note);

	await notesRepository.update(
		{
			id: new mongodb.ObjectID(noteId) as any,
			userId: new mongodb.ObjectID(userId) as any,
		},
		{
			contentHTML,
			contentText,
			encryption,
			passwordVersionCodeName,
			certificateVersionCodeName,
			lastModifiedTime: new Date().getTime(),
		}
	);
	logger.info(`[notes.data.setNoteEncryptionMethodData] Update the note "${noteId}" encryption method succeed`);
}

export async function setNoteTagsData(noteId: string, userId: string, tags: string[]) {
	logger.info(`[notes.data.setNoteTagsData] About to update the note "${noteId}" tags ...`);

	const notesRepository = getMongoRepository(Note);
	await notesRepository.update(
		{
			id: new mongodb.ObjectID(noteId) as any,
			userId: new mongodb.ObjectID(userId) as any,
		},
		{
			tags,
			lastModifiedTime: new Date().getTime(),
		}
	);
	logger.info(`[notes.data.setNoteTagsData] Updating the note "${noteId}" tags succeed`);
}

export async function deleteNotesTagData(userId: string, tag: string) {
	logger.info(`[notes.data.deleteNotesTagData] About to remove tag "${tag}" from ALL user's "${userId}" notes ...`);

	const notesRepository = getMongoRepository(Note);
	await notesRepository.updateMany(
		{
			userId: new mongodb.ObjectID(userId) as any, // For all user's notes
		},
		{
			$pull: {
				// Pull is a mongodb selector that here is going to walk on all objects and "pull" the from all tags properties the "tag" value.
				tags: tag,
			},
		}
	);
	logger.info(`[notes.data.setNoteTagsData] update the note "${userId}" tags succeed`);
}
