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
} from "tsoa";
import { NoteStatus } from "../core";
import { Note } from "../models";
import { NotesService } from "../services";

@Route("notes")
export class NotesController extends Controller {

  @Post("/")
  public async createNotes(@Header() userId: string): Promise<string> {
    return await new NotesService().createNote(userId);
  }

  @Put("/status/{noteId}")
  public async setNotes(@Path() noteId: string, @Header() userId: string, @Body() setNote: { status: NoteStatus } ) {
    return await new NotesService().setNote(noteId, setNote.status , userId);
  }

  @Delete("/{noteId}")
  public async deleteNotes(@Path() noteId: string, @Header() userId: string) {
    return await new NotesService().deleteNotes(noteId, userId);
  }

  @Get("/workspace")
  public async getOpenNotes(@Header() userId: string): Promise<Note[]> {
    return await new NotesService().getOpenNotes(userId);
  }

  @Get("/backlog")
  public async getBacklogNotes(@Header() userId: string): Promise<Note[]> {
    return await new NotesService().getBacklogNotes(userId);
  }
}