import type { SearchParams } from "nuqs";
import { skipToken } from "@tanstack/react-query";

import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { FoldersSidebar } from "@/features/folders/folders-sidebar";
import { NoteEditorPanel } from "@/features/notes/note-editor-panel";
import { NotesList } from "@/features/notes/notes-list";
import { loadSearchParams } from "@/features/notes/query-params";
import { prefetch, trpc } from "@/trpc/server";

type PageProps = {
  searchParams: Promise<SearchParams>;
};

export default async function NotesPage({ searchParams }: PageProps) {
  const params = await loadSearchParams(searchParams);

  prefetch(
    trpc.note.list.queryOptions(params.folderId ? { folderId: params.folderId } : skipToken)
  );
  prefetch(trpc.folder.list.queryOptions());

  return (
    <div className="bg-secondary/50 size-full">
      <ResizablePanelGroup
        direction="horizontal"
        autoSaveId="main-layout"
      >
        <ResizablePanel
          defaultSize={15}
          minSize={10}
          maxSize={20}
          collapsible
          className="bg-secondary"
        >
          <FoldersSidebar />
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel
          defaultSize={35}
          minSize={20}
          maxSize={35}
        >
          <NotesList />
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize={50}>
          <NoteEditorPanel />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
