"use client";

import { useEffect } from "react";
import { skipToken, useQuery } from "@tanstack/react-query";
import { Folder, Pin } from "lucide-react";

import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc";
import { useNotesSearchParams } from "./query-params";

export function NotesList() {
  const trpc = useTRPC();
  const isMobile = useIsMobile();

  const { folderId, noteId, setNoteId, setFolderId, q, clearQuery } = useNotesSearchParams();

  // Use global search when there's a search query, otherwise use folder-scoped list
  const searchQuery = q?.trim();
  const isSearching = Boolean(searchQuery);

  const { data: folderNotes, isFetching: isFetchingFolder } = useQuery(
    trpc.note.list.queryOptions(!isSearching && folderId ? { folderId, q } : skipToken)
  );

  const { data: searchResults, isFetching: isFetchingSearch } = useQuery(
    trpc.note.globalSearch.queryOptions(searchQuery ? { q: searchQuery } : skipToken)
  );

  const notes = isSearching ? searchResults : folderNotes;
  const isFetching = isSearching ? isFetchingSearch : isFetchingFolder;

  // Auto-select the first note when folder has notes and no note is selected
  // Only on desktop - on mobile, user navigates manually through stack navigation
  useEffect(() => {
    // Don't auto-select on mobile - it breaks back navigation
    if (isMobile) return;
    // Don't auto-select while fetching to avoid race conditions with new note creation
    if (isFetching) return;
    // Don't auto-select while searching - user will click the result they want
    // and updating the URL steals focus from the search input
    if (isSearching) return;
    if (!folderId || !notes || notes.length === 0) return;

    const isNoteInFolder = noteId && notes.some((note) => note.id === noteId);
    if (!isNoteInFolder) {
      setNoteId(notes[0].id);
    }
  }, [folderId, notes, noteId, setNoteId, isFetching, isSearching, isMobile]);

  // Handle selecting a note from search results (navigate to its folder and clear search)
  const handleSelectNote = (note: { id: string; folderId: string }) => {
    if (isSearching) {
      setFolderId(note.folderId);
      clearQuery();
    }
    setNoteId(note.id);
  };

  const showEmptyState = !isSearching && !folderId;
  const hasNotes = notes && notes.length > 0;

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-11 items-center gap-2 border-b px-3">
        <span className="text-sm font-medium">
          {isSearching ? `Search Results (${notes?.length ?? 0})` : `Notes (${notes?.length ?? 0})`}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {showEmptyState && (
          <p className="text-muted-foreground mt-10 w-full p-3 text-center">
            Select a folder to view notes
          </p>
        )}
        {!showEmptyState && hasNotes && (
          <ul className="flex w-full flex-col">
            {notes.map((note) => {
              const folderName =
                isSearching && "folder" in note && note.folder ?
                  (note.folder as { name: string }).name
                : null;
              return (
                <li
                  key={note.id}
                  onClick={() => handleSelectNote(note)}
                  className={cn(
                    "cursor-pointer rounded-md px-6 pt-3 transition-colors",
                    noteId === note.id && "bg-accent/70"
                  )}
                >
                  <div className="w-full border-b-[.5px] pb-2">
                    <div className="flex items-center gap-1.5">
                      {note.pinned && (
                        <Pin className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
                      )}
                      <span className="truncate font-bold">{note.title || "Untitled"}</span>
                    </div>
                    <div className="text-muted-foreground mt-1 flex items-center gap-2 text-sm">
                      {folderName && (
                        <span className="flex items-center gap-1">
                          <Folder className="h-3 w-3" />
                          {folderName}
                        </span>
                      )}
                      <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {!showEmptyState && !hasNotes && (
          <p className="text-muted-foreground mt-10 w-full p-3 text-center">
            {isSearching ? "No notes match your search" : "Create your first note in this folder"}
          </p>
        )}
      </div>
    </div>
  );
}
