import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";
import { z } from "zod";

import { folder } from "@quick-jot/db/schema/folders";

import { createTRPCRouter, protectedProcedure } from "../trpc";

export const folderRouter = createTRPCRouter({
  /**
   * Create a new folder
   */
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        parentId: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // If parentId is provided, verify it exists and belongs to the user
      if (input.parentId) {
        const parentFolder = await ctx.db.query.folder.findFirst({
          where: and(eq(folder.id, input.parentId), eq(folder.userId, userId)),
        });

        if (!parentFolder) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Parent folder not found",
          });
        }
      }

      const [newFolder] = await ctx.db
        .insert(folder)
        .values({
          name: input.name,
          parentId: input.parentId ?? null,
          userId,
        })
        .returning();

      return newFolder;
    }),

  /**
   * Get all folders for the current user (flat list)
   * Client can build tree structure from this
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const folders = await ctx.db.query.folder.findMany({
      where: eq(folder.userId, userId),
      orderBy: [asc(folder.updatedAt)],
    });

    return folders;
  }),

  /**
   * Get root folders (folders with no parent)
   */
  listRoot: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const folders = await ctx.db.query.folder.findMany({
      where: and(eq(folder.userId, userId), isNull(folder.parentId)),
      orderBy: [desc(folder.updatedAt)],
    });

    return folders;
  }),

  /**
   * Get subfolders of a specific folder
   */
  listChildren: protectedProcedure
    .input(z.object({ parentId: z.string() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const folders = await ctx.db.query.folder.findMany({
        where: and(eq(folder.userId, userId), eq(folder.parentId, input.parentId)),
        orderBy: [desc(folder.updatedAt)],
      });

      return folders;
    }),

  /**
   * Get a single folder by ID
   */
  get: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    const userId = ctx.session.user.id;

    const result = await ctx.db.query.folder.findFirst({
      where: and(eq(folder.id, input.id), eq(folder.userId, userId)),
    });

    if (!result) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Folder not found",
      });
    }

    return result;
  }),

  /**
   * Update a folder (rename or move)
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(255).optional(),
        parentId: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Verify folder exists and belongs to user
      const existingFolder = await ctx.db.query.folder.findFirst({
        where: and(eq(folder.id, input.id), eq(folder.userId, userId)),
      });

      if (!existingFolder) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Folder not found",
        });
      }

      // If moving to a new parent, verify the parent exists and belongs to user
      if (input.parentId !== undefined && input.parentId !== null) {
        // Prevent moving a folder into itself
        if (input.parentId === input.id) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cannot move a folder into itself",
          });
        }

        const parentFolder = await ctx.db.query.folder.findFirst({
          where: and(eq(folder.id, input.parentId), eq(folder.userId, userId)),
        });

        if (!parentFolder) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Parent folder not found",
          });
        }
      }

      const updateData: Partial<typeof folder.$inferInsert> = {};
      if (input.name !== undefined) updateData.name = input.name;
      if (input.parentId !== undefined) updateData.parentId = input.parentId;

      const [updatedFolder] = await ctx.db
        .update(folder)
        .set(updateData)
        .where(and(eq(folder.id, input.id), eq(folder.userId, userId)))
        .returning();

      return updatedFolder;
    }),

  /**
   * Delete a folder (cascades to subfolders and notes)
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Verify folder exists and belongs to user
      const existingFolder = await ctx.db.query.folder.findFirst({
        where: and(eq(folder.id, input.id), eq(folder.userId, userId)),
      });

      if (!existingFolder) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Folder not found",
        });
      }

      // Prevent deletion of default folder
      if (existingFolder.isDefault) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot delete the default folder",
        });
      }

      // Get all user's folders to find descendants
      const allFolders = await ctx.db.query.folder.findMany({
        where: eq(folder.userId, userId),
      });

      // Recursively collect all descendant folder IDs
      const collectDescendantIds = (parentId: string): string[] => {
        const children = allFolders.filter((f) => f.parentId === parentId);
        const childIds = children.map((c) => c.id);
        const descendantIds = children.flatMap((c) => collectDescendantIds(c.id));
        return [...childIds, ...descendantIds];
      };

      const idsToDelete = [input.id, ...collectDescendantIds(input.id)];

      // Delete all folders (parent and descendants)
      await ctx.db
        .delete(folder)
        .where(and(inArray(folder.id, idsToDelete), eq(folder.userId, userId)));

      return { success: true };
    }),

  /**
   * Ensure user has a default folder, create one if not
   * Called on first login/app load
   */
  ensureDefaultFolder: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    // Check if user already has a default folder
    const existingDefaultFolder = await ctx.db.query.folder.findFirst({
      where: and(eq(folder.userId, userId), eq(folder.isDefault, true)),
    });

    // If user has no default folder, create one
    if (!existingDefaultFolder) {
      const [defaultFolder] = await ctx.db
        .insert(folder)
        .values({
          name: "Notes",
          parentId: null,
          userId,
          isDefault: true,
        })
        .returning();

      return { created: true, folder: defaultFolder };
    }

    // User already has a default folder
    return { created: false, folder: existingDefaultFolder };
  }),
});
