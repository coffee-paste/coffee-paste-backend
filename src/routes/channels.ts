
import WebSocket from 'ws';
import express, { Response as ExResponse, Request as ExRequest } from "express";
import { notesService } from '../services'
import * as uuid from 'uuid';
import { Duration } from 'unitsnet-js';
import debounce from 'lodash.debounce';
import { IncomingNoteUpdate, logger, notesContentUpdateDebounce, NotesUpdateDebounceInfo, NoteUpdate, VerifiedWebSocket } from '../core';
import { incomingNoteUpdateSchema, schemaValidator, verifyJwtToken } from '../security';

/** Time to await for DB update till last note update  */
const DEBOUNCE_NOTES_CHANGES_UPDATE = Duration.FromSeconds(20);
/**
 * The channels collection map by userIds
 */
const notesChannels: {
    [key: string]: VerifiedWebSocket[];
} = {};

async function removeChannel(verifiedWebSocket: VerifiedWebSocket) {
    logger.info(`[channels.removeChannel] about to remove socket "${verifiedWebSocket.id}" of user "${verifiedWebSocket.user.userId}"...`)
    // Get the user channels collection
    const userChannels = notesChannels[verifiedWebSocket.user.userId];

    // Look for the channel index
    const channelIndex = userChannels?.findIndex(cannel => cannel.id === verifiedWebSocket.id);

    // If the channel already removed, abort.
    if (channelIndex === -1) {
        logger.info(`[channels.removeChannel] socket "${verifiedWebSocket.id}" not exists in the user "${verifiedWebSocket.user.userId}" collection, aborting`)
        return;
    }
    // Remove the channel
    userChannels.splice(channelIndex, 1);
    logger.info(`[channels.removeChannel] Remove socket "${verifiedWebSocket.id}" of user "${verifiedWebSocket.user.userId}" succeed`)

}

async function broadcastNote(userId: string, channelId: string, noteUpdate: NoteUpdate) {
    logger.info(`[channels.broadcastNote] about to broadcast note "${noteUpdate.noteId}" of user "${userId}"...`)
    // Get all user channels
    const userChannels = notesChannels[userId];

    // If there no any channel, abort
    if (!userChannels) {
        return;
    }

    // Send update to check user channel
    for (const channel of userChannels) {
        // Skip channel that sent this update..
        if (channelId === channel.id) {
            continue;
        }
        try {
            channel.send(JSON.stringify(noteUpdate));
        } catch (error) {
            logger.error(`[channels.broadcastNote] broadcasting note "${noteUpdate.noteId}" of user "${userId}" to channel "${channel.id}" failed`, error)
        }
    }
    logger.info(`[channels.broadcastNote] broadcasting note "${noteUpdate.noteId}" of user "${userId}" done`)
}

/**
 * In order to keep DB performance, implement debounce logic to update DB only X time after updating note finished  
 */
async function saveNoteUpdateDebounced(noteId: string, userId: string, contentText: string, contentHTML: string) {

    logger.info(`[channels.saveNoteUpdateDebounced] About to handle update for ${noteId}`);

    const notesUpdateDebounceInfo = notesContentUpdateDebounce.get(noteId) as NotesUpdateDebounceInfo;

    // If a debounce for the note not exists yet, create one for it.
    if (!notesUpdateDebounceInfo) {
        logger.info(`[channels.saveNoteUpdateDebounced] Creating new debounce cache object for ${noteId}...`);
        // Create the debounce function
        const debounceFunc = debounce(() => {
            (async () => {
                logger.info(`[channels.saveNoteUpdateDebounced] Debounce for ${noteId} triggered`);

                // If the state not exists, abort update
                const notesUpdateDebounceInfo = notesContentUpdateDebounce.get(noteId);
                if (!notesUpdateDebounceInfo) {
                    return;
                }
                try {
                    logger.info(`[channels.saveNoteUpdateDebounced] About to flush DB update for ${noteId}`);
                    // Save the last state of the note in the DB
                    await notesService.setOpenNoteContent(noteId, userId, notesUpdateDebounceInfo.lastState.contentText, notesUpdateDebounceInfo.lastState.contentHTML);
                } catch (error) {
                    logger.error(`[channels.saveNoteUpdateDebounced] invoking setOpenNoteContent for noteId ${noteId} failed `)
                }
            })();
        }, DEBOUNCE_NOTES_CHANGES_UPDATE.Milliseconds) as unknown as () => void;
        notesContentUpdateDebounce.set(noteId, {
            debounceFunc,
            lastState: {
                contentHTML,
                contentText,
            }
        });
    }

    logger.info(`[channels.saveNoteUpdateDebounced] Updating debounce cache and calling debounce for ${noteId}`);

    // Call to the debounceFunc
    notesUpdateDebounceInfo.debounceFunc();

    // Keep the current note state
    notesUpdateDebounceInfo.lastState = {
        contentHTML,
        contentText
    }
}

async function handleIncomingChannel(verifiedWebSocket: VerifiedWebSocket) {
    const userId = verifiedWebSocket.user.userId;
    logger.info(`[channels.handleIncomingChannel] adding channel "${verifiedWebSocket.id}" to the user "${userId}" collection`)

    if (!notesChannels[userId]) {
        notesChannels[userId] = [];
    }
    notesChannels[userId].push(verifiedWebSocket);

    verifiedWebSocket.on('message', async (msg: string) => {
        logger.info(`[channels.handleIncomingChannel] New message arrived from channel "${verifiedWebSocket.id}"`)
        try {
            const incomingNoteUpdateRaw: IncomingNoteUpdate = JSON.parse(msg);
            // Validate user input
            const incomingNoteUpdate = await schemaValidator<IncomingNoteUpdate>(incomingNoteUpdateRaw, incomingNoteUpdateSchema);

            const { noteId, contentText, contentHTML } = incomingNoteUpdate;

            await saveNoteUpdateDebounced(noteId, userId, contentText, contentHTML);

            // After update content succeed, broadcast the new note content
            await broadcastNote(userId, verifiedWebSocket.id, {
                noteId,
                contentHTML,
            });
        } catch (error) {
            logger.error(`[channels.handleIncomingChannel] message handling from channel "${verifiedWebSocket.id}" failed`, error);
        }
    });

    verifiedWebSocket.on('close', async (code: number) => {
        logger.info(`[channels.handleIncomingChannel] Channel "${verifiedWebSocket.id}" closed with code "${code}"`);
        removeChannel(verifiedWebSocket);
    });

    verifiedWebSocket.on('error', async (err: Error) => {
        logger.warn(`[channels.handleIncomingChannel] Channel "${verifiedWebSocket.id}" error accord`, err);
        removeChannel(verifiedWebSocket);
    });
}

export function handleChannels(wss: WebSocket.Server) {

    wss.on('connection', async (ws: WebSocket, req: ExRequest) => {
        logger.info(`[channels.handleChannels] New channel connection arrived`)

        try {
            // Extract the JWT token from the path query
            const jwt = req.url.split('=')[1] || '';
            // Verify the JWT
            const verifiedUser = await verifyJwtToken(jwt);
            const verifiedWebSocket = (ws as VerifiedWebSocket);
            // Set unique ID and the user info session as WS properties
            verifiedWebSocket.id = uuid.v4();
            verifiedWebSocket.user = verifiedUser;
            // Continue handling the new connection
            await handleIncomingChannel(verifiedWebSocket);
        } catch (error) {
            logger.error(`[channels.handleIncomingChannel] validating new channel authentication failed, closing WS`, error);
            ws.close(403);
        }
    });
}