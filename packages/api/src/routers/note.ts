import { TRPCError } from "@trpc/server";
import { and, desc, eq, ilike } from "drizzle-orm";
import { z } from "zod";

import type { JSONContent } from "@quick-jot/db/schema/notes";
import { folder } from "@quick-jot/db/schema/folders";
import { note } from "@quick-jot/db/schema/notes";

import { createTRPCRouter, protectedProcedure } from "../trpc";

export const noteFilterSchema = z.object({
  folderId: z.string(),
  q: z.string().optional(),
});

export type NoteFilter = z.infer<typeof noteFilterSchema>;

const jsonContentSchema: z.ZodType<JSONContent> = z.lazy(() =>
  z.object({
    type: z.string().optional(),
    attrs: z.record(z.string(), z.unknown()).optional(),
    content: z.array(jsonContentSchema).optional(),
    marks: z
      .array(
        z.object({
          type: z.string(),
          attrs: z.record(z.string(), z.unknown()).optional(),
        })
      )
      .optional(),
    text: z.string().optional(),
  })
);

export const noteRouter = createTRPCRouter({
  /**
   * Create a new note in a folder
   */
  create: protectedProcedure
    .input(
      z.object({
        title: z.string().max(500).default(""),
        content: jsonContentSchema.nullable().optional(),
        folderId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Verify folder exists and belongs to user
      const targetFolder = await ctx.db.query.folder.findFirst({
        where: and(eq(folder.id, input.folderId), eq(folder.userId, userId)),
      });

      if (!targetFolder) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Folder not found",
        });
      }

      const [newNote] = await ctx.db
        .insert(note)
        .values({
          title: input.title,
          content: input.content ?? null,
          folderId: input.folderId,
          userId,
        })
        .returning();

      return newNote;
    }),

  /**
   * Get all notes in a folder (ordered by updatedAt desc)
   */
  list: protectedProcedure.input(noteFilterSchema).query(async ({ ctx, input }) => {
    const userId = ctx.session.user.id;

    // Verify folder belongs to user
    const targetFolder = await ctx.db.query.folder.findFirst({
      where: and(eq(folder.id, input.folderId), eq(folder.userId, userId)),
    });

    if (!targetFolder) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Folder not found",
      });
    }

    const conditions = [eq(note.folderId, input.folderId), eq(note.userId, userId)];

    if (input.q) {
      conditions.push(ilike(note.title, `%${input.q}%`));
    }

    const notes = await ctx.db.query.note.findMany({
      where: and(...conditions),
      orderBy: [desc(note.updatedAt)],
    });

    return notes;
  }),

  /**
   * Get a single note by ID
   */
  get: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    const userId = ctx.session.user.id;

    const result = await ctx.db.query.note.findFirst({
      where: and(eq(note.id, input.id), eq(note.userId, userId)),
    });

    if (!result) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Note not found",
      });
    }

    return result;
  }),

  /**
   * Update a note's title and/or content
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().max(500).optional(),
        content: jsonContentSchema.nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Verify note exists and belongs to user
      const existingNote = await ctx.db.query.note.findFirst({
        where: and(eq(note.id, input.id), eq(note.userId, userId)),
      });

      if (!existingNote) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Note not found",
        });
      }

      const updateData: Partial<typeof note.$inferInsert> = {};
      if (input.title !== undefined) updateData.title = input.title;
      if (input.content !== undefined) updateData.content = input.content;

      const [updatedNote] = await ctx.db
        .update(note)
        .set(updateData)
        .where(and(eq(note.id, input.id), eq(note.userId, userId)))
        .returning();

      return updatedNote;
    }),

  /**
   * Move a note to a different folder
   */
  move: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        folderId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Verify note exists and belongs to user
      const existingNote = await ctx.db.query.note.findFirst({
        where: and(eq(note.id, input.id), eq(note.userId, userId)),
      });

      if (!existingNote) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Note not found",
        });
      }

      // Verify target folder exists and belongs to user
      const targetFolder = await ctx.db.query.folder.findFirst({
        where: and(eq(folder.id, input.folderId), eq(folder.userId, userId)),
      });

      if (!targetFolder) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Target folder not found",
        });
      }

      const [movedNote] = await ctx.db
        .update(note)
        .set({ folderId: input.folderId })
        .where(and(eq(note.id, input.id), eq(note.userId, userId)))
        .returning();

      return movedNote;
    }),

  /**
   * Delete a note
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Verify note exists and belongs to user
      const existingNote = await ctx.db.query.note.findFirst({
        where: and(eq(note.id, input.id), eq(note.userId, userId)),
      });

      if (!existingNote) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Note not found",
        });
      }

      await ctx.db.delete(note).where(and(eq(note.id, input.id), eq(note.userId, userId)));

      return { success: true };
    }),
});
