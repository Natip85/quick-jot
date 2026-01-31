"use client";

import { useNotesSearchParams } from "../query-params";
import { MobileFoldersList } from "./mobile-folders-list";
import { MobileNoteEditor } from "./mobile-note-editor";
import { MobileNotesList } from "./mobile-notes-list";

export function MobileNotesView() {
  const { folderId, noteId } = useNotesSearchParams();

  if (noteId) {
    return <MobileNoteEditor />;
  }

  if (folderId) {
    return <MobileNotesList />;
  }

  return <MobileFoldersList />;
}
