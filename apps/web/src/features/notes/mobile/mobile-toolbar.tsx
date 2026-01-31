"use client";

import type { Editor } from "@tiptap/react";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bold,
  Check,
  ChevronDown,
  FolderIcon,
  Highlighter,
  ImageIcon,
  Italic,
  Link,
  List,
  ListOrdered,
  Loader2,
  MoreVertical,
  Pin,
  PinOff,
  Quote,
  Redo,
  Strikethrough,
  Trash2,
  Type,
  Underline,
  Undo,
} from "lucide-react";

import type { EditorState } from "../editor/editor-toolbar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Toggle } from "@/components/ui/toggle";
import { UploadButton } from "@/lib/uploadthing";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc";
import { useNotesSearchParams } from "../query-params";

type MobileToolbarProps = {
  editor: Editor | null;
  editorState: EditorState;
  noteId?: string | null;
  currentFolderId?: string | null;
  isPinned?: boolean;
  onDelete?: () => void;
};

const TEXT_COLORS = [
  { name: "Default", color: undefined },
  { name: "Gray", color: "#6b7280" },
  { name: "Red", color: "#ef4444" },
  { name: "Orange", color: "#f97316" },
  { name: "Yellow", color: "#eab308" },
  { name: "Green", color: "#22c55e" },
  { name: "Blue", color: "#3b82f6" },
  { name: "Purple", color: "#a855f7" },
  { name: "Pink", color: "#ec4899" },
];

export function MobileToolbar({
  editor,
  editorState,
  noteId,
  currentFolderId,
  isPinned,
  onDelete,
}: MobileToolbarProps) {
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [showFormatSheet, setShowFormatSheet] = useState(false);

  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { setSearchParams } = useNotesSearchParams();

  const { data: folders } = useQuery(trpc.folder.list.queryOptions());

  const { mutate: moveNote } = useMutation(
    trpc.note.move.mutationOptions({
      onSuccess: (data, variables) => {
        if (currentFolderId) {
          void queryClient.invalidateQueries({
            queryKey: trpc.note.list.queryKey({ folderId: currentFolderId }),
          });
        }
        void queryClient.invalidateQueries({
          queryKey: trpc.note.list.queryKey({ folderId: variables.folderId }),
        });
        void setSearchParams({ folderId: variables.folderId, noteId: variables.id });
      },
    })
  );

  const { mutate: togglePin } = useMutation(
    trpc.note.togglePin.mutationOptions({
      onSuccess: (data) => {
        if (currentFolderId) {
          void queryClient.invalidateQueries({
            queryKey: trpc.note.list.queryKey({ folderId: currentFolderId }),
          });
        }
        if (data) {
          queryClient.setQueryData(trpc.note.get.queryKey({ id: data.id }), data);
        }
      },
    })
  );

  const handleSetLink = () => {
    if (linkUrl) {
      editor?.chain().focus().setLink({ href: linkUrl }).run();
    } else {
      editor?.chain().focus().unsetLink().run();
    }
    setShowLinkInput(false);
    setLinkUrl("");
  };

  const handleLinkToggle = () => {
    if (editorState?.isLink) {
      editor?.chain().focus().unsetLink().run();
    } else {
      setLinkUrl(editorState?.linkUrl ?? "");
      setShowLinkInput(true);
    }
  };

  const handleSetColor = (color: string | undefined) => {
    if (color) {
      editor?.chain().focus().setColor(color).run();
    } else {
      editor?.chain().focus().unsetColor().run();
    }
  };

  const getCurrentBlockLabel = () => {
    if (editorState?.isHeading1) return "Title";
    if (editorState?.isHeading2) return "Heading";
    if (editorState?.isHeading3) return "Subheading";
    if (editorState?.isCodeBlock) return "Code";
    if (editorState?.isBulletList) return "Bullet";
    if (editorState?.isOrderedList) return "Numbered";
    if (editorState?.isBlockquote) return "Quote";
    return "Body";
  };

  return (
    <>
      {/* Main Toolbar */}
      <div className="bg-background/95 supports-[backdrop-filter]:bg-background/60 flex items-center gap-1 border-t p-2 backdrop-blur">
        {/* Undo/Redo */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => editor?.commands.undo()}
          disabled={!editorState?.canUndo}
          className="size-10"
        >
          <Undo className="size-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => editor?.commands.redo()}
          disabled={!editorState?.canRedo}
          className="size-10"
        >
          <Redo className="size-5" />
        </Button>

        <div className="bg-border mx-1 h-6 w-px" />

        {/* Quick Format Buttons */}
        <Toggle
          pressed={editorState?.isBold}
          onPressedChange={() => editor?.chain().focus().toggleBold().run()}
          disabled={!editorState?.canBold}
          className="size-10"
        >
          <Bold className="size-5" />
        </Toggle>
        <Toggle
          pressed={editorState?.isItalic}
          onPressedChange={() => editor?.chain().focus().toggleItalic().run()}
          disabled={!editorState?.canItalic}
          className="size-10"
        >
          <Italic className="size-5" />
        </Toggle>

        {/* Block Type Dropdown */}
        <Sheet
          open={showFormatSheet}
          onOpenChange={setShowFormatSheet}
        >
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-10 gap-1 px-2"
            >
              <Type className="size-4" />
              <span className="text-xs">{getCurrentBlockLabel()}</span>
              <ChevronDown className="size-3" />
            </Button>
          </SheetTrigger>
          <SheetContent
            side="bottom"
            className="h-auto max-h-[80vh]"
          >
            <SheetHeader>
              <SheetTitle>Formatting</SheetTitle>
            </SheetHeader>
            <div className="mt-4 space-y-4">
              {/* Text Styles */}
              <div>
                <h4 className="text-muted-foreground mb-2 text-sm font-medium">Text Style</h4>
                <div className="flex flex-wrap gap-2">
                  <Toggle
                    pressed={editorState?.isBold}
                    onPressedChange={() => editor?.chain().focus().toggleBold().run()}
                    className="size-12"
                  >
                    <Bold className="size-5" />
                  </Toggle>
                  <Toggle
                    pressed={editorState?.isItalic}
                    onPressedChange={() => editor?.chain().focus().toggleItalic().run()}
                    className="size-12"
                  >
                    <Italic className="size-5" />
                  </Toggle>
                  <Toggle
                    pressed={editorState?.isUnderline}
                    onPressedChange={() => editor?.chain().focus().toggleUnderline().run()}
                    className="size-12"
                  >
                    <Underline className="size-5" />
                  </Toggle>
                  <Toggle
                    pressed={editorState?.isStrike}
                    onPressedChange={() => editor?.chain().focus().toggleStrike().run()}
                    className="size-12"
                  >
                    <Strikethrough className="size-5" />
                  </Toggle>
                  <Toggle
                    pressed={editorState?.isHighlight}
                    onPressedChange={() => editor?.chain().focus().toggleHighlight().run()}
                    className="size-12"
                  >
                    <Highlighter className="size-5" />
                  </Toggle>
                  <Toggle
                    pressed={editorState?.isLink}
                    onPressedChange={handleLinkToggle}
                    className="size-12"
                  >
                    <Link className="size-5" />
                  </Toggle>
                </div>
              </div>

              {/* Link Input */}
              {showLinkInput && (
                <div className="flex items-center gap-2">
                  <Input
                    type="url"
                    placeholder="Enter URL..."
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    className="h-10 flex-1"
                    autoFocus
                  />
                  <Button
                    onClick={handleSetLink}
                    className="h-10"
                  >
                    {linkUrl ? "Set" : "Remove"}
                  </Button>
                </div>
              )}

              {/* Block Types */}
              <div>
                <h4 className="text-muted-foreground mb-2 text-sm font-medium">Block Type</h4>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={editorState?.isHeading1 ? "secondary" : "outline"}
                    onClick={() => {
                      editor?.chain().focus().toggleHeading({ level: 1 }).run();
                      setShowFormatSheet(false);
                    }}
                    className="h-12 justify-start text-xl font-bold"
                  >
                    Title
                  </Button>
                  <Button
                    variant={editorState?.isHeading2 ? "secondary" : "outline"}
                    onClick={() => {
                      editor?.chain().focus().toggleHeading({ level: 2 }).run();
                      setShowFormatSheet(false);
                    }}
                    className="h-12 justify-start text-lg font-semibold"
                  >
                    Heading
                  </Button>
                  <Button
                    variant={editorState?.isParagraph ? "secondary" : "outline"}
                    onClick={() => {
                      editor?.chain().focus().setParagraph().run();
                      setShowFormatSheet(false);
                    }}
                    className="h-12 justify-start"
                  >
                    Body
                  </Button>
                  <Button
                    variant={editorState?.isCodeBlock ? "secondary" : "outline"}
                    onClick={() => {
                      editor?.chain().focus().toggleCodeBlock().run();
                      setShowFormatSheet(false);
                    }}
                    className="h-12 justify-start font-mono"
                  >
                    Code
                  </Button>
                </div>
              </div>

              {/* Lists */}
              <div>
                <h4 className="text-muted-foreground mb-2 text-sm font-medium">Lists</h4>
                <div className="flex gap-2">
                  <Toggle
                    pressed={editorState?.isBulletList}
                    onPressedChange={() => {
                      editor?.chain().focus().toggleBulletList().run();
                      setShowFormatSheet(false);
                    }}
                    className="h-12 flex-1"
                  >
                    <List className="mr-2 size-5" />
                    Bullet
                  </Toggle>
                  <Toggle
                    pressed={editorState?.isOrderedList}
                    onPressedChange={() => {
                      editor?.chain().focus().toggleOrderedList().run();
                      setShowFormatSheet(false);
                    }}
                    className="h-12 flex-1"
                  >
                    <ListOrdered className="mr-2 size-5" />
                    Numbered
                  </Toggle>
                  <Toggle
                    pressed={editorState?.isBlockquote}
                    onPressedChange={() => {
                      editor?.chain().focus().toggleBlockquote().run();
                      setShowFormatSheet(false);
                    }}
                    className="h-12 flex-1"
                  >
                    <Quote className="mr-2 size-5" />
                    Quote
                  </Toggle>
                </div>
              </div>

              {/* Colors */}
              <div>
                <h4 className="text-muted-foreground mb-2 text-sm font-medium">Text Color</h4>
                <div className="flex flex-wrap gap-3">
                  {TEXT_COLORS.map((item) => (
                    <button
                      key={item.name}
                      type="button"
                      title={item.name}
                      onClick={() => handleSetColor(item.color)}
                      className={cn(
                        "size-10 rounded-full border-2 transition-transform active:scale-95",
                        editorState?.currentColor === item.color &&
                          "ring-primary ring-2 ring-offset-2"
                      )}
                      style={{
                        backgroundColor: item.color ?? "transparent",
                        borderColor: item.color ? "transparent" : "currentColor",
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Image Upload */}
              <div>
                <h4 className="text-muted-foreground mb-2 text-sm font-medium">Insert</h4>
                <UploadButton
                  endpoint="imageUploader"
                  onUploadBegin={() => setIsUploading(true)}
                  onClientUploadComplete={(res) => {
                    setIsUploading(false);
                    if (res?.[0]?.url) {
                      editor?.chain().focus().setImage({ src: res[0].url }).run();
                    }
                    setShowFormatSheet(false);
                  }}
                  onUploadError={() => {
                    setIsUploading(false);
                  }}
                  appearance={{
                    button:
                      "ut-ready:bg-secondary ut-uploading:bg-secondary/50 text-secondary-foreground w-full h-12 text-sm",
                    allowedContent: "text-muted-foreground text-xs",
                  }}
                  content={{
                    button: () => (
                      <span className="flex items-center gap-2">
                        {isUploading ?
                          <Loader2 className="size-5 animate-spin" />
                        : <ImageIcon className="size-5" />}
                        {isUploading ? "Uploading..." : "Add Image"}
                      </span>
                    ),
                  }}
                />
              </div>
            </div>
          </SheetContent>
        </Sheet>

        {/* Spacer */}
        <div className="flex-1" />

        {/* More Options */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-10"
            >
              <MoreVertical className="size-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-48"
          >
            <DropdownMenuItem
              onClick={() => {
                if (noteId) {
                  togglePin({ id: noteId });
                }
              }}
            >
              {isPinned ?
                <>
                  <PinOff className="mr-2 size-4" />
                  Unpin note
                </>
              : <>
                  <Pin className="mr-2 size-4" />
                  Pin note
                </>
              }
            </DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <FolderIcon className="mr-2 size-4" />
                Move to
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {folders?.map((folder) => (
                  <DropdownMenuItem
                    key={folder.id}
                    disabled={folder.id === currentFolderId}
                    onClick={() => {
                      if (noteId) {
                        moveNote({ id: noteId, folderId: folder.id });
                      }
                    }}
                  >
                    <FolderIcon className="mr-2 size-4" />
                    {folder.name}
                    {folder.id === currentFolderId && <Check className="ml-auto size-4" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            {onDelete && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <DropdownMenuItem
                    onSelect={(e) => e.preventDefault()}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 size-4" />
                    Delete note
                  </DropdownMenuItem>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete note</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete this note? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      variant="destructive"
                      onClick={onDelete}
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );
}
