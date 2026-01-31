"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { EditIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useTRPC } from "@/trpc";
import { useNotesSearchParams } from "../query-params";

export function AddNoteButton() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { folderId, setNoteId } = useNotesSearchParams();

  const { mutate: createNote } = useMutation(
    trpc.note.create.mutationOptions({
      onSuccess: (newNote) => {
        void queryClient.invalidateQueries(trpc.note.list.pathFilter());
        setNoteId(newNote.id);
      },
    })
  );

  const handleAddNote = () => {
    if (!folderId) return;
    createNote({ title: "New note", folderId });
  };

  if (!folderId) return null;

  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-8 p-0"
      onClick={handleAddNote}
    >
      <EditIcon className="size-4" />
      <span className="sr-only">Add note</span>
    </Button>
  );
}
