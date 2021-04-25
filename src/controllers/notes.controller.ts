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
import { NoteStatus } from "../core";
import { Note } from "../models";
import { notesService } from "../services";
import express, { Response as ExResponse, Request as ExRequest } from "express";
import { generateChannelKey } from "../security";

@Tags('Notes')
@Route("notes")
export class NotesController extends Controller {

  @Security('jwt', ['user'])
  @Post("/")
  public async createNote(@Request() request: ExRequest, @Body() body: { name?: string }): Promise<string> {
    return await notesService.createNote(request.user.userId, body.name);
  }

  @Security('jwt', ['user'])
  @Put("/status/{noteId}")
  public async setNotes(@Request() request: ExRequest, @Path() noteId: string, @Body() setNote: { status: NoteStatus }) {
    return await notesService.setNoteStatus(noteId, setNote.status, request.user.userId);
  }

  @Security('jwt', ['user'])
  @Put("/content/{noteId}")
  public async setNotesContent(@Request() request: ExRequest, @Path() noteId: string, @Body() content: { contentText: string, contentHTML: string }) {
    return await notesService.setNoteContent(noteId, request.user.userId, content.contentText, content.contentHTML);
  }

  @Security('jwt', ['user'])
  @Put("/name/{noteId}")
  public async setNotesName(@Request() request: ExRequest, @Path() noteId: string, @Body() body: { name: string }) {
    return await notesService.setNoteName(noteId, request.user.userId, body.name);
  }

  @Security('jwt', ['user'])
  @Delete("/{noteId}")
  public async deleteNotes(@Request() request: ExRequest, @Path() noteId: string) {
    return await notesService.deleteNotes(noteId, request.user.userId);
  }

  @Security('jwt', ['user'])
  @Get("/workspace")
  public async getOpenNotes(@Request() request: ExRequest): Promise<Note[]> {
    return await notesService.getWorkspaceNotes(request.user.userId);
  }

  /**
   * Generating channel key in order to allow open web-socket channel.
   * The key should append to the WS URL as channelKey param, the channel key is valid for 1 minute only.
   * @returns Channel generate one-time key
   */
  @Security('jwt', ['user'])
  @Get("/channel-key")
  public async getChannelKey(@Request() request: ExRequest): Promise<string> {
    return generateChannelKey(request.user);
  }

  @Security('jwt', ['user'])
  @Get("/backlog")
  public async getBacklogNotes(@Request() request: ExRequest): Promise<Note[]> {
    return await notesService.getBacklogNotes(request.user.userId);
  }
}