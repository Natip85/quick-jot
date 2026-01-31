"use client";

import { useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import type { Folder as FlatFolder } from "@quick-jot/db/schema/folders";

import type { FolderNode } from "./folder-tree";
import { useTRPC } from "@/trpc";
import { useNotesSearchParams } from "../notes/query-params";
import { AddFolderDialog } from "./add-folder-dialog";
import { FolderTree } from "./folder-tree";

/**
 * Converts a flat list of folders into a nested tree structure
 */
function buildFolderTree(flatFolders: FlatFolder[]): FolderNode[] {
  const folderMap = new Map<string, FolderNode>();
  const rootFolders: FolderNode[] = [];

  // First pass: create FolderNode objects for all folders
  for (const folder of flatFolders) {
    folderMap.set(folder.id, {
      id: folder.id,
      name: folder.name,
      isDefault: folder.isDefault,
      children: [],
    });
  }

  // Second pass: build the tree structure
  for (const folder of flatFolders) {
    const node = folderMap.get(folder.id);
    if (!node) continue;

    const parent = folder.parentId ? folderMap.get(folder.parentId) : null;
    if (parent) {
      parent.children.push(node);
    } else {
      rootFolders.push(node);
    }
  }

  return rootFolders;
}

export function FoldersSidebar() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { folderId, setFolderId } = useNotesSearchParams();

  const { mutate: ensureDefaultFolderMutation } = useMutation(
    trpc.folder.ensureDefaultFolder.mutationOptions({
      onSuccess: (data) => {
        if (data.created) {
          void queryClient.invalidateQueries({ queryKey: trpc.folder.list.queryKey() });
        }
      },
    })
  );

  const { mutate: createFolder } = useMutation(
    trpc.folder.create.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: trpc.folder.list.queryKey() });
      },
    })
  );

  const { mutate: updateFolder } = useMutation(
    trpc.folder.update.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: trpc.folder.list.queryKey() });
      },
    })
  );

  const { mutate: deleteFolder } = useMutation(
    trpc.folder.delete.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: trpc.folder.list.queryKey() });
      },
    })
  );

  useEffect(() => {
    ensureDefaultFolderMutation();
  }, [ensureDefaultFolderMutation]);

  const { data: folders, isLoading } = useQuery(trpc.folder.list.queryOptions());

  // Convert flat folder list to tree structure
  const folderTree = useMemo(() => {
    if (!folders) return [];
    return buildFolderTree(folders);
  }, [folders]);

  const handleAddFolder = (parentId: string) => {
    createFolder({ name: "New Folder", parentId });
  };

  const handleRenameFolder = (id: string, newName: string) => {
    updateFolder({ id, name: newName });
  };

  const handleDeleteFolder = (id: string) => {
    deleteFolder({ id });
    if (folderId === id) {
      setFolderId(null);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-11 items-center justify-between border-b px-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Folders</span>
        </div>
        <AddFolderDialog />
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ?
          <div className="flex items-center justify-center py-4">
            <Loader2 className="text-muted-foreground size-4 animate-spin" />
          </div>
        : <FolderTree
            folders={folderTree}
            selectedId={folderId}
            onSelectedChange={setFolderId}
            onAddFolder={handleAddFolder}
            onRenameFolder={handleRenameFolder}
            onDeleteFolder={handleDeleteFolder}
            className="flex-1"
          />
        }
      </div>
    </div>
  );
}
