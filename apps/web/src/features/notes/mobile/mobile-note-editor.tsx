"use client";

import type { JSONContent } from "@tiptap/react";
import { useCallback, useEffect, useRef } from "react";
import { skipToken, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import { TextStyle } from "@tiptap/extension-text-style";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useSwipeBack } from "@/hooks/use-swipe-back";
import { useTRPC } from "@/trpc";
import { useNotesSearchParams } from "../query-params";
import { MobileHeader } from "./mobile-header";
import { MobileToolbar } from "./mobile-toolbar";

type NoteUpdate = {
  id: string;
  title: string;
  content: JSONContent;
} | null;

/**
 * Extracts text from the first block of TipTap JSON content to use as the note title
 */
function extractTitleFromContent(content: JSONContent): string {
  const firstBlock = content.content?.[0];
  if (!firstBlock) return "New note";

  const extractText = (node: JSONContent): string => {
    if (node.text) return node.text;
    if (node.content) {
      return node.content.map(extractText).join("");
    }
    return "";
  };

  const title = extractText(firstBlock).trim();
  return title || "New note";
}

function formatNoteDate(date: Date) {
  const day = date.getDate();
  const month = date.toLocaleString("en-US", { month: "long" });
  const year = date.getFullYear();
  const time = date
    .toLocaleString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
    .toLowerCase();
  return `${day} ${month} ${year} at ${time}`;
}

export function MobileNoteEditor() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { folderId, noteId, setNoteId } = useNotesSearchParams();

  const { data: note } = useQuery(trpc.note.get.queryOptions(noteId ? { id: noteId } : skipToken));

  const { mutate: update } = useMutation(
    trpc.note.update.mutationOptions({
      onSuccess: (data) => {
        if (data && folderId) {
          void queryClient.invalidateQueries({
            queryKey: trpc.note.list.queryKey({ folderId }),
          });
        }
        if (data) {
          queryClient.setQueryData(trpc.note.get.queryKey({ id: data.id }), data);
        }
      },
    })
  );

  const { mutate: deleteNote } = useMutation(
    trpc.note.delete.mutationOptions({
      onSuccess: () => {
        if (folderId) {
          void queryClient.invalidateQueries({
            queryKey: trpc.note.list.queryKey({ folderId }),
          });
        }
        // Go back to notes list
        setNoteId(null);
      },
    })
  );

  const { onChange: onNoteChange } = useDebouncedValue<NoteUpdate>({
    initialValue: null,
    delay: 500,
    onDebouncedChange: (value) => {
      if (value) {
        update(value);
      }
    },
  });

  const content = note?.content?.content as JSONContent[] | undefined;

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Highlight,
      TextStyle,
      Color,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-primary underline cursor-pointer",
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: "max-w-full h-auto rounded-lg",
        },
      }),
    ],
    immediatelyRender: false,
    autofocus: false,
    editable: true,
    injectCSS: false,
    onUpdate: ({ editor }) => {
      if (noteId) {
        const editorContent = editor.getJSON();
        const title = extractTitleFromContent(editorContent);
        onNoteChange({ id: noteId, title, content: editorContent });
      }
    },
    content: content?.length ? { type: "doc", content } : undefined,
  });

  const hasInitializedContent = useRef(false);

  // Reset the initialized flag when switching to a different note
  useEffect(() => {
    hasInitializedContent.current = false;
  }, [noteId]);

  useEffect(() => {
    if (editor && content?.length && !hasInitializedContent.current) {
      editor.commands.setContent({ type: "doc", content }, { emitUpdate: false });
      hasInitializedContent.current = true;
    }
  }, [editor, content]);

  const editorState = useEditorState({
    editor,
    selector: (ctx) => {
      if (!ctx.editor) return {};
      return {
        isBold: ctx.editor?.isActive("bold"),
        canBold: ctx.editor?.can().chain().focus().toggleBold().run(),
        isItalic: ctx.editor?.isActive("italic"),
        canItalic: ctx.editor?.can().chain().focus().toggleItalic().run(),
        isUnderline: ctx.editor?.isActive("underline"),
        canUnderline: ctx.editor?.can().chain().focus().toggleUnderline().run(),
        isStrike: ctx.editor?.isActive("strike"),
        canStrike: ctx.editor?.can().chain().focus().toggleStrike().run(),
        isCode: ctx.editor?.isActive("code"),
        canCode: ctx.editor?.can().chain().focus().toggleCode().run(),
        isHighlight: ctx.editor?.isActive("highlight"),
        canHighlight: ctx.editor?.can().chain().focus().toggleHighlight().run(),
        isLink: ctx.editor?.isActive("link"),
        linkUrl: ctx.editor?.getAttributes("link").href as string | undefined,
        currentColor: ctx.editor?.getAttributes("textStyle").color as string | undefined,
        isParagraph: ctx.editor?.isActive("paragraph"),
        isHeading1: ctx.editor?.isActive("heading", { level: 1 }),
        isHeading2: ctx.editor?.isActive("heading", { level: 2 }),
        isHeading3: ctx.editor?.isActive("heading", { level: 3 }),
        isBulletList: ctx.editor?.isActive("bulletList"),
        isOrderedList: ctx.editor?.isActive("orderedList"),
        isCodeBlock: ctx.editor?.isActive("codeBlock"),
        isBlockquote: ctx.editor?.isActive("blockquote"),
        canUndo: ctx.editor?.can().undo(),
        canRedo: ctx.editor?.can().redo(),
      };
    },
  });

  const handleBack = useCallback(() => {
    setNoteId(null);
  }, [setNoteId]);

  // Swipe from left edge to go back to notes list
  useSwipeBack({ onSwipeBack: handleBack });

  const handleDelete = () => {
    if (noteId) {
      deleteNote({ id: noteId });
    }
  };

  return (
    <div className="flex h-full flex-col">
      <MobileHeader
        title={note?.title ?? "Note"}
        onBack={handleBack}
      />

      {/* Editor Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {note?.updatedAt && (
          <div className="text-muted-foreground mb-4 text-center text-xs">
            {note.createdAt.getTime() === note.updatedAt.getTime() ? "Created" : "Updated"}{" "}
            {formatNoteDate(note.updatedAt)}
          </div>
        )}
        <EditorContent
          editor={editor}
          className="prose prose-neutral dark:prose-invert [&_.ProseMirror_blockquote]:border-border [&_.ProseMirror_pre]:bg-muted [&_.ProseMirror_code]:bg-muted max-w-none focus:outline-none [&_.ProseMirror]:min-h-[50vh] [&_.ProseMirror]:focus:outline-none [&_.ProseMirror_blockquote]:border-l-4 [&_.ProseMirror_blockquote]:pl-4 [&_.ProseMirror_blockquote]:italic [&_.ProseMirror_code]:rounded [&_.ProseMirror_code]:px-1 [&_.ProseMirror_h1]:mb-4 [&_.ProseMirror_h1]:text-2xl [&_.ProseMirror_h1]:font-bold [&_.ProseMirror_h2]:mb-3 [&_.ProseMirror_h2]:text-xl [&_.ProseMirror_h2]:font-bold [&_.ProseMirror_li]:mb-1 [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:pl-6 [&_.ProseMirror_p]:mb-4 [&_.ProseMirror_pre]:overflow-x-auto [&_.ProseMirror_pre]:rounded [&_.ProseMirror_pre]:p-4 [&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pl-6"
        />
      </div>

      {/* Bottom Toolbar */}
      <MobileToolbar
        editor={editor}
        editorState={editorState ?? {}}
        noteId={noteId}
        currentFolderId={folderId}
        isPinned={note?.pinned}
        onDelete={handleDelete}
      />
    </div>
  );
}
