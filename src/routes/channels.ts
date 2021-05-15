
import WebSocket from 'ws';
import express, { Response as ExResponse, Request as ExRequest } from "express";
import { notesService } from '../services'
import * as uuid from 'uuid';
import { Duration } from 'unitsnet-js';
import debounce from 'lodash.debounce';
import { logger, notesContentUpdateDebounce, NotesUpdateDebounceInfo, VerifiedWebSocket } from '../core';
import { incomingNoteUpdateSchema, schemaValidator, verifyChannelSession } from '../security';
import { IncomingNoteUpdate, NoteUpdate, NoteUpdateEvent, OutgoingNoteUpdate } from '../core/channel.protocol';

export type NoteEvent = Omit<OutgoingNoteUpdate, 'sid'>;

/** Time to await for DB update till last note update  */
const DEBOUNCE_NOTES_CHANGES_UPDATE = Duration.FromSeconds(200);
/**
 * The channels collection map by userIds
 */
const notesChannels: {
    [key: string]: VerifiedWebSocket[];
} = {};

async function removeChannel(verifiedWebSocket: VerifiedWebSocket) {
    logger.info(`[channels.removeChannel] about to remove socket "${verifiedWebSocket.sid}" of user "${verifiedWebSocket.user.userId}"...`)
    // Get the user channels collection
    const userChannels = notesChannels[verifiedWebSocket.user.userId];

    // Look for the channel index
    const channelIndex = userChannels?.findIndex(cannel => cannel.sid === verifiedWebSocket.sid);

    // If the channel already removed, abort.
    if (channelIndex === -1) {
        logger.info(`[channels.removeChannel] socket "${verifiedWebSocket.sid}" not exists in the user "${verifiedWebSocket.user.userId}" collection, aborting`)
        return;
    }
    // Remove the channel
    userChannels.splice(channelIndex, 1);
    logger.info(`[channels.removeChannel] Remove socket "${verifiedWebSocket.sid}" of user "${verifiedWebSocket.user.userId}" succeed`)

}

async function broadcastNoteEvent(userId: string, channelId: string,  outgoingNoteUpdate: OutgoingNoteUpdate) {
    logger.info(`[channels.broadcastNoteEvent] about to broadcast note "${outgoingNoteUpdate.noteId}" of user "${userId}"...`)
    // Get all user channels
    const userChannels = notesChannels[userId];

    // If there no any channel, abort
    if (!userChannels) {
        return;
    }

    // Send update to check user channel
    for (const channel of userChannels) {
        // Skip channel that sent this update..
        if (channelId === channel.sid) {
            continue;
        }
        try {
            channel.send(JSON.stringify(outgoingNoteUpdate));
        } catch (error) {
            logger.error(`[channels.broadcastNoteEvent] broadcasting note "${outgoingNoteUpdate.noteId}" of user "${userId}" to channel "${channel.sid}" failed`, error)
        }
    }
    logger.info(`[channels.broadcastNoteEvent] broadcasting note "${outgoingNoteUpdate.noteId}" of user "${userId}" done`)
}

/**
 * In order to keep DB performance, implement debounce logic to update DB only X time after updating note finished  
 */
async function saveNoteUpdateDebounced(noteId: string, userId: string, contentText: string, contentHTML: string) {

    logger.info(`[channels.saveNoteUpdateDebounced] About to handle update for ${noteId}`);

    let notesUpdateDebounceInfo = notesContentUpdateDebounce.get(noteId);

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
        notesUpdateDebounceInfo = {
            debounceFunc,
            lastState: {
                contentHTML,
                contentText,
            }
        } as NotesUpdateDebounceInfo;
        notesContentUpdateDebounce.set(noteId, notesUpdateDebounceInfo);
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
    logger.info(`[channels.handleIncomingChannel] adding channel "${verifiedWebSocket.sid}" to the user "${userId}" collection`)

    if (!notesChannels[userId]) {
        notesChannels[userId] = [];
    }
    notesChannels[userId].push(verifiedWebSocket);

    verifiedWebSocket.on('message', async (msg: string) => {
        logger.info(`[channels.handleIncomingChannel] New message arrived from channel "${verifiedWebSocket.sid}"`)
        try {
            const incomingNoteUpdateRaw: IncomingNoteUpdate = JSON.parse(msg);
            // Validate user input
            const incomingNoteUpdate = await schemaValidator<IncomingNoteUpdate>(incomingNoteUpdateRaw, incomingNoteUpdateSchema);

            const { noteId, contentText, contentHTML } = incomingNoteUpdate;

            await saveNoteUpdateDebounced(noteId, userId, contentText, contentHTML);

            // After update content succeed, broadcast the new note content
            await broadcastNoteEvent(userId, verifiedWebSocket.sid, {
                noteId,
                contentHTML,
                event: NoteUpdateEvent.FEED,
            });
        } catch (error) {
            logger.error(`[channels.handleIncomingChannel] message handling from channel "${verifiedWebSocket.sid}" failed`, error);
        }
    });

    verifiedWebSocket.on('close', async (code: number) => {
        logger.info(`[channels.handleIncomingChannel] Channel "${verifiedWebSocket.sid}" closed with code "${code}"`);
        removeChannel(verifiedWebSocket);
    });

    verifiedWebSocket.on('error', async (err: Error) => {
        logger.warn(`[channels.handleIncomingChannel] Channel "${verifiedWebSocket.sid}" error accord`, err);
        removeChannel(verifiedWebSocket);
    });
}

export function publishNoteEvent(userId: string, noteEvent: NoteEvent, channelSession?: string) {
    broadcastNoteEvent(userId, channelSession || '', {
        ...noteEvent,
    });
}

export function handleChannels(wss: WebSocket.Server) {

    wss.on('connection', async (ws: WebSocket, req: ExRequest) => {
        logger.info(`[channels.handleChannels] New channel connection arrived`)

        try {
            // Extract the channelSession from the path query
            const channelSession = req.url.split('=')[1] || '';
            // Verify the session
            const verifiedUser = verifyChannelSession(channelSession);
            const verifiedWebSocket = (ws as VerifiedWebSocket);
            // use session as the unique ID and the user info session as WS properties
            verifiedWebSocket.sid = channelSession;
            verifiedWebSocket.user = verifiedUser;
            // Continue handling the new connection
            await handleIncomingChannel(verifiedWebSocket);
        } catch (error) {
            logger.error(`[channels.handleIncomingChannel] validating new channel authentication failed, closing WS`, error);
            ws.close(403);
        }
    });
}