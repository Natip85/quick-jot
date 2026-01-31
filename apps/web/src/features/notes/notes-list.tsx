"use client";

import { useEffect } from "react";
import { skipToken, useQuery } from "@tanstack/react-query";
import { Pin } from "lucide-react";

import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc";
import { useNotesSearchParams } from "./query-params";

export function NotesList() {
  const trpc = useTRPC();
  const isMobile = useIsMobile();

  const { folderId, noteId, setNoteId, q } = useNotesSearchParams();
  const { data: notes, isFetching } = useQuery(
    trpc.note.list.queryOptions(folderId ? { folderId, q } : skipToken)
  );

  // Auto-select the first note when folder has notes and no note is selected
  // Only on desktop - on mobile, user navigates manually through stack navigation
  useEffect(() => {
    // Don't auto-select on mobile - it breaks back navigation
    if (isMobile) return;
    // Don't auto-select while fetching to avoid race conditions with new note creation
    if (isFetching) return;
    // Don't auto-select while searching - user will click the result they want
    // and updating the URL steals focus from the search input
    if (q) return;
    if (!folderId || !notes || notes.length === 0) return;

    const isNoteInFolder = noteId && notes.some((note) => note.id === noteId);
    if (!isNoteInFolder) {
      setNoteId(notes[0].id);
    }
  }, [folderId, notes, noteId, setNoteId, isFetching, q, isMobile]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-11 items-center gap-2 border-b px-3">
        <span className="text-sm font-medium">Notes ({notes?.length})</span>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {!folderId ?
          <p className="text-muted-foreground mt-10 w-full p-3 text-center">
            Select a folder to view notes
          </p>
        : notes && notes.length > 0 ?
          <ul className="flex w-full flex-col">
            {notes.map((note) => (
              <li
                key={note.id}
                onClick={() => setNoteId(note.id)}
                className={cn(
                  "rounded-md px-6 pt-3 transition-colors",
                  noteId === note.id && "bg-accent/70"
                )}
              >
                <div className="w-full border-b-[.5px] pb-2">
                  <div className="flex items-center gap-1.5">
                    {note.pinned && <Pin className="text-muted-foreground h-3.5 w-3.5 shrink-0" />}
                    <span className="truncate font-bold">{note.title}</span>
                  </div>
                  <div className="mt-1 text-sm">
                    {new Date(note.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        : <p className="text-muted-foreground mt-10 w-full p-3 text-center">
            {q ? "No notes match your search" : "Create your first note in this folder"}
          </p>
        }
      </div>
    </div>
  );
}
