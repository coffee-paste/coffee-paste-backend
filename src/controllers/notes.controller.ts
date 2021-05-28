import {
  Body,
  Controller,
  Get,
  Path,
  Post,
  Put,
  Query,
  Route,
  Header,
  SuccessResponse,
  Delete,
  Security,
  Request,
  Tags,
} from "tsoa";
import { AuthMethod, AuthScope, NotesPage, NoteStatus, PageRequest } from "../core";
import { Note } from "../models";
import { notesService } from "../services";
import express, { Response as ExResponse, Request as ExRequest } from "express";
import { generateChannelSession } from "../security";
import { publishNoteEvent } from "../routes";
import { NoteUpdateEvent } from "../core/channel.protocol";

@Tags('Notes')
@Route("notes")
export class NotesController extends Controller {

  /**
   * Create new note in the workspace
   * @param channelSid The front session channel, used to skip this channel while updating succeed action via WS 
   * @returns The new note id
   */
  @Security(AuthMethod.JWT, [AuthScope.USER])
  @Post("/")
  public async createNote(@Request() request: ExRequest, @Body() body: { name?: string }, @Header() channelSid?: string): Promise<string> {
    const noteId = await notesService.createNote(request.user.userId, body.name);
    publishNoteEvent(request.user.userId, {
      noteId,
      event: NoteUpdateEvent.NEW,
      name: body.name,
    }, channelSid);
    return noteId;
  }

  /**
   * Move note from/to workspace/archive
   * @param channelSid The front session channel, used to skip this channel while updating succeed action via WS 
   */
  @Security(AuthMethod.JWT, [AuthScope.USER])
  @Put("/status/{noteId}")
  public async setNotes(@Request() request: ExRequest, @Path() noteId: string, @Body() setNote: { status: NoteStatus }, @Header() channelSid?: string) {
    await notesService.setNoteStatus(noteId, setNote.status, request.user.userId);
    publishNoteEvent(request.user.userId, {
      noteId,
      event: setNote.status === NoteStatus.Backlog ? NoteUpdateEvent.NEW : NoteUpdateEvent.REMOVE,
    }, channelSid);
  }

  /**
   * Set note content, (you can use also the WS channel API for that)
   * @param channelSid The front session channel, used to skip this channel while updating succeed action via WS 
   */
  @Security(AuthMethod.JWT, [AuthScope.USER])
  @Put("/content/{noteId}")
  public async setNotesContent(@Request() request: ExRequest, @Path() noteId: string, @Body() content: { contentText: string, contentHTML: string }, @Header() channelSid?: string) {
    await notesService.setNoteContent(noteId, request.user.userId, content.contentText, content.contentHTML);
    publishNoteEvent(request.user.userId, {
      noteId,
      event: NoteUpdateEvent.FEED,
      contentHTML: content.contentHTML,
    }, channelSid);
  }

  /**
   * Set note name 
   * @param channelSid The front session channel, used to skip this channel while updating succeed action via WS 
   */
  @Security(AuthMethod.JWT, [AuthScope.USER])
  @Put("/name/{noteId}")
  public async setNotesName(@Request() request: ExRequest, @Path() noteId: string, @Body() body: { name: string }, @Header() channelSid?: string) {
    await notesService.setNoteName(noteId, request.user.userId, body.name);
    publishNoteEvent(request.user.userId, {
      noteId,
      event: NoteUpdateEvent.UPDATE,
      name: body.name,
    }, channelSid);
  }

  /**
   * Permanently delete note 
   * @param channelSid The front session channel, used to skip this channel while updating succeed action via WS 
   */
  @Security(AuthMethod.JWT, [AuthScope.USER])
  @Delete("/{noteId}")
  public async deleteNotes(@Request() request: ExRequest, @Path() noteId: string, @Header() channelSid?: string) {
    await notesService.deleteNotes(noteId, request.user.userId);
    publishNoteEvent(request.user.userId, {
      noteId,
      event: NoteUpdateEvent.REMOVE,
    }, channelSid);
  }

  @Security(AuthMethod.JWT, [AuthScope.USER])
  @Get("/workspace")
  public async getOpenNotes(@Request() request: ExRequest): Promise<Note[]> {
    return await notesService.getWorkspaceNotes(request.user.userId);
  }

  /**
   * Generating channel session in order to allow open web-socket channel.
   * The key should append to the WS URL as channelSession param, the channel key is valid for 1 minute only.
   * Note to keep this session and send it in the REST request channelSid so the current channel will not send update about request sent from this client.
   * @returns Channel generate one-time key
   */
  @Security(AuthMethod.JWT, [AuthScope.USER])
  @Get("/channel-session")
  public async getChannelKey(@Request() request: ExRequest): Promise<string> {
    return generateChannelSession(request.user);
  }

  @Security(AuthMethod.JWT, [AuthScope.USER])
  @Get("/backlog")
  public async getBacklogNotes(@Request() request: ExRequest): Promise<Note[]> {
    return await notesService.getBacklogNotes(request.user.userId);
  }

  // It's a post request only because of TSOA limitation for body in get requests
  @Security(AuthMethod.JWT, [AuthScope.USER])
  @Post("/backlog/page")
  public async getBacklogNotesPage(@Request() request: ExRequest, @Body() page: PageRequest): Promise<NotesPage> {
    return await notesService.getBacklogNotesPage(request.user.userId, page);
  }

  @Security(AuthMethod.JWT, [AuthScope.USER])
  @Get("/{noteId}")
  public async getNote(@Request() request: ExRequest, @Path() noteId: string): Promise<Note> {
    return await notesService.getNote(noteId, request.user.userId);
  }


  ////////////// ADMIN API's //////////////////

  @Security(AuthMethod.API_KEY, [AuthScope.ADMIN])
  @Get("workspace/{userId}")
  public async getOpenNotesByUser(@Path() userId: string): Promise<Note[]> {
    return await notesService.getWorkspaceNotes(userId);
  }

  @Security(AuthMethod.API_KEY, [AuthScope.ADMIN])
  @Get("backlog/{userId}")
  public async getBacklogNotesByUser(@Path() userId: string): Promise<Note[]> {
    return await notesService.getBacklogNotes(userId);
  }
}