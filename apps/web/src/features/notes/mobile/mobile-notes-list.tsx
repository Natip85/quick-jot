"use client";

import { useCallback } from "react";
import { skipToken, useQuery } from "@tanstack/react-query";
import { Pin } from "lucide-react";

import { useSwipeBack } from "@/hooks/use-swipe-back";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc";
import { AddNoteButton } from "../editor/add-note-button";
import { useNotesSearchParams } from "../query-params";
import { MobileHeader } from "./mobile-header";

export function MobileNotesList() {
  const trpc = useTRPC();
  const { folderId, noteId, setNoteId, setFolderId, q } = useNotesSearchParams();

  const { data: notes } = useQuery(
    trpc.note.list.queryOptions(folderId ? { folderId, q } : skipToken)
  );

  const { data: folders } = useQuery(trpc.folder.list.queryOptions());

  // Find the current folder name
  const currentFolder = folders?.find((f) => f.id === folderId);
  const folderName = currentFolder?.name ?? "Notes";

  const handleBack = useCallback(() => {
    setFolderId(null);
  }, [setFolderId]);

  // Swipe from left edge to go back to folders
  useSwipeBack({ onSwipeBack: handleBack });

  return (
    <div className="flex h-full flex-col">
      <MobileHeader
        title={folderName}
        onBack={handleBack}
        actions={<AddNoteButton />}
      />

      <div className="flex-1 overflow-y-auto">
        {notes && notes.length > 0 ?
          <ul className="flex w-full flex-col p-2">
            {notes.map((note) => (
              <li
                key={note.id}
                onClick={() => setNoteId(note.id)}
                className={cn(
                  "active:bg-accent/80 min-h-[60px] rounded-lg px-4 py-3 transition-colors",
                  noteId === note.id && "bg-accent/70"
                )}
              >
                <div className="flex items-center gap-2">
                  {note.pinned && <Pin className="text-muted-foreground h-4 w-4 shrink-0" />}
                  <span className="truncate font-semibold">{note.title}</span>
                </div>
                <div className="text-muted-foreground mt-1 text-sm">
                  {new Date(note.createdAt).toLocaleDateString()}
                </div>
              </li>
            ))}
          </ul>
        : <div className="text-muted-foreground flex flex-1 flex-col items-center justify-center p-8 text-center">
            <p className="text-sm">{q ? "No notes match your search" : "No notes yet"}</p>
            {!q && <p className="mt-1 text-xs">Tap the icon above to create your first note</p>}
          </div>
        }
      </div>
    </div>
  );
}
