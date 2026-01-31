"use client";

import type { JSONContent } from "@tiptap/react";
import { skipToken, useQuery } from "@tanstack/react-query";

import { useTRPC } from "@/trpc";
import { AddNoteButton } from "./editor/add-note-button";
import { RichTextEditor } from "./editor/rich-text-editor";
import { useNotesSearchParams } from "./query-params";

function formatNoteDate(date: Date) {
  const day = date.getDate();
  const month = date.toLocaleString("en-US", { month: "long" });
  const year = date.getFullYear();
  const time = date
    .toLocaleString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
    .toLowerCase();
  return `${day} ${month} ${year} at ${time}`;
}

export function NoteEditorPanel() {
  const trpc = useTRPC();
  const { folderId, noteId } = useNotesSearchParams();
  const { data: note } = useQuery(trpc.note.get.queryOptions(noteId ? { id: noteId } : skipToken));

  return (
    <div className="flex h-full flex-col">
      {noteId ?
        <RichTextEditor
          key={noteId}
          content={note?.content?.content as JSONContent[]}
          toolbarLeadingContent={<AddNoteButton />}
          isPinned={note?.pinned}
        >
          <div className="text-muted-foreground mb-8 text-center text-sm">
            {note?.updatedAt && (
              <>
                {note.createdAt.getTime() === note.updatedAt.getTime() ? "Created" : "Updated"}{" "}
                {formatNoteDate(note.updatedAt)}
              </>
            )}
          </div>
        </RichTextEditor>
      : <>
          {folderId && (
            <div className="bg-muted/50 flex h-11 items-center gap-1 border-b px-3">
              <AddNoteButton />
            </div>
          )}
          <div className="text-muted-foreground flex flex-1 items-center justify-center p-4 text-center text-sm">
            {folderId ? "Select a note or create a new one" : "Select a folder to get started"}
          </div>
        </>
      }
    </div>
  );
}
