"use client";

import * as React from "react";
import {
  ChevronRight,
  FolderIcon,
  FolderOpen,
  FolderPlus,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";

import type { Folder } from "@quick-jot/db/schema/folders";

import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type FolderNode = Pick<Folder, "id" | "name" | "isDefault"> & {
  children: FolderNode[];
};

type FolderTreeContextType = {
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  editingId: string | null;
  setEditingId: (id: string | null) => void;
  onAddFolder: (parentId: string) => void;
  onRenameFolder: (id: string, newName: string) => void;
  onDeleteFolder: (id: string) => void;
};

const FolderTreeContext = React.createContext<FolderTreeContextType | null>(null);

function useFolderTree() {
  const context = React.useContext(FolderTreeContext);
  if (!context) {
    throw new Error("useFolderTree must be used within a FolderTreeProvider");
  }
  return context;
}

type FolderItemProps = {
  folder: FolderNode;
  level: number;
};

function FolderItem({ folder, level }: FolderItemProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const {
    selectedId,
    setSelectedId,
    editingId,
    setEditingId,
    onAddFolder,
    onRenameFolder,
    onDeleteFolder,
  } = useFolderTree();
  const [editName, setEditName] = React.useState(folder.name);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const isSelected = selectedId === folder.id;
  const isEditing = editingId === folder.id;
  const hasChildren = folder.children.length > 0;
  const isDefault = folder.isDefault ?? false;

  React.useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  React.useEffect(() => {
    setEditName(folder.name);
  }, [folder.name]);

  const handleRename = () => {
    if (editName.trim() && editName !== folder.name) {
      onRenameFolder(folder.id, editName.trim());
    } else {
      setEditName(folder.name);
    }
    setEditingId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleRename();
    } else if (e.key === "Escape") {
      setEditName(folder.name);
      setEditingId(null);
    }
  };

  const handleAddSubfolder = () => {
    setIsOpen(true);
    onAddFolder(folder.id);
  };

  const FolderContent = (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
    >
      <div className="group/folder relative">
        <ContextMenu>
          <ContextMenuTrigger asChild>
            <div
              className={cn(
                "flex cursor-pointer items-center gap-1 rounded-md px-2 py-1.5 text-sm transition-colors",
                "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                isSelected && "bg-sidebar-accent text-sidebar-accent-foreground"
              )}
              style={{ paddingLeft: `${level * 12 + 8}px` }}
              onClick={() => setSelectedId(folder.id)}
            >
              <CollapsibleTrigger
                asChild
                onClick={(e) => e.stopPropagation()}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn("size-5 p-0 hover:bg-transparent", !hasChildren && "invisible")}
                >
                  <ChevronRight
                    className={cn(
                      "text-sidebar-foreground/70 size-4 shrink-0 transition-transform duration-200",
                      isOpen && "rotate-90"
                    )}
                  />
                </Button>
              </CollapsibleTrigger>

              {isOpen ?
                <FolderOpen className="size-4 shrink-0" />
              : <FolderIcon className="size-4 shrink-0" />}

              {isEditing ?
                <Input
                  ref={inputRef}
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onBlur={handleRename}
                  onKeyDown={handleKeyDown}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-background h-6 px-1 py-0 text-sm"
                />
              : <span className="flex-1 truncate">{folder.name}</span>}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "size-6 p-0 opacity-0 transition-opacity group-hover/folder:opacity-100",
                      "hover:bg-sidebar-accent"
                    )}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal className="size-4" />
                    <span className="sr-only">More options</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  className="w-48"
                >
                  {!isDefault && (
                    <DropdownMenuItem onClick={handleAddSubfolder}>
                      <FolderPlus className="mr-2 size-4" />
                      New Subfolder
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => setEditingId(folder.id)}>
                    <Pencil className="mr-2 size-4" />
                    Rename
                  </DropdownMenuItem>
                  {!isDefault && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => onDeleteFolder(folder.id)}
                      >
                        <Trash2 className="mr-2 size-4" />
                        Delete
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </ContextMenuTrigger>
          <ContextMenuContent className="w-48">
            {!isDefault && (
              <ContextMenuItem onClick={handleAddSubfolder}>
                <FolderPlus className="mr-2 size-4" />
                New Subfolder
              </ContextMenuItem>
            )}
            <ContextMenuItem onClick={() => setEditingId(folder.id)}>
              <Pencil className="mr-2 size-4" />
              Rename
            </ContextMenuItem>
            {!isDefault && (
              <>
                <ContextMenuSeparator />
                <ContextMenuItem
                  variant="destructive"
                  onClick={() => onDeleteFolder(folder.id)}
                >
                  <Trash2 className="mr-2 size-4" />
                  Delete
                </ContextMenuItem>
              </>
            )}
          </ContextMenuContent>
        </ContextMenu>
      </div>

      <CollapsibleContent>
        {folder.children.map((child) => (
          <FolderItem
            key={child.id}
            folder={child}
            level={level + 1}
          />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );

  return FolderContent;
}

type FolderTreeProps = {
  folders: FolderNode[];
  selectedId?: string | null;
  onSelectedChange?: (id: string | null) => void;
  onAddFolder: (parentId: string) => void;
  onRenameFolder: (id: string, newName: string) => void;
  onDeleteFolder: (id: string) => void;
  className?: string;
};

export function FolderTree({
  folders,
  selectedId: selectedIdProp,
  onSelectedChange,
  onAddFolder,
  onRenameFolder,
  onDeleteFolder,
  className,
}: FolderTreeProps) {
  const [selectedIdInternal, setSelectedIdInternal] = React.useState<string | null>(null);
  const [editingId, setEditingId] = React.useState<string | null>(null);

  const selectedId = selectedIdProp ?? selectedIdInternal;
  const setSelectedId = onSelectedChange ?? setSelectedIdInternal;

  return (
    <FolderTreeContext.Provider
      value={{
        selectedId,
        setSelectedId,
        editingId,
        setEditingId,
        onAddFolder,
        onRenameFolder,
        onDeleteFolder,
      }}
    >
      <div className={cn("flex flex-col", className)}>
        <div className="flex-1 overflow-auto p-2">
          {folders.length === 0 ?
            <div className="text-muted-foreground flex flex-col items-center justify-center p-4 text-center">
              <FolderIcon className="mb-2 size-10 opacity-40" />
              <p className="text-sm">No folders yet</p>
              <p className="text-xs">Click the button below to create one</p>
            </div>
          : folders.map((folder) => (
              <FolderItem
                key={folder.id}
                folder={folder}
                level={0}
              />
            ))
          }
        </div>
      </div>
    </FolderTreeContext.Provider>
  );
}
