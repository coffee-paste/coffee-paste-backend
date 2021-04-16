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
import { NotesService } from "../services";
import express, { Response as ExResponse, Request as ExRequest } from "express";

@Tags('Notes')
@Route("notes")
export class NotesController extends Controller {

  @Security('jwt', ['user'])
  @Post("/")
  public async createNotes(@Request() request: ExRequest): Promise<string> {
    return await new NotesService().createNote(request.user.userId);
  }

  @Security('jwt', ['user'])
  @Put("/status/{noteId}")
  public async setNotes(@Request() request: ExRequest, @Path() noteId: string, @Body() setNote: { status: NoteStatus }) {
    return await new NotesService().setNote(noteId, setNote.status, request.user.userId);
  }

  @Security('jwt', ['user'])
  @Delete("/{noteId}")
  public async deleteNotes(@Request() request: ExRequest, @Path() noteId: string) {
    return await new NotesService().deleteNotes(noteId, request.user.userId);
  }

  @Security('jwt', ['user'])
  @Get("/workspace")
  public async getOpenNotes(@Request() request: ExRequest): Promise<Note[]> {
    return await new NotesService().getOpenNotes(request.user.userId);
  }

  @Security('jwt', ['user'])
  @Get("/backlog")
  public async getBacklogNotes(@Request() request: ExRequest): Promise<Note[]> {
    return await new NotesService().getBacklogNotes(request.user.userId);
  }
}