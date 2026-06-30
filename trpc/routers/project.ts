import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import { project } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { assertCan } from "@/lib/rebac";

export const projectRouter = router({
  list: protectedProcedure
    .input(z.object({ workspaceId: z.string() }))
    .query(async ({ ctx, input }) => {
      await assertCan(
        ctx.session.user.id,
        "member",
        "workspace",
        input.workspaceId
      );

      return db
        .select()
        .from(project)
        .where(eq(project.workspaceId, input.workspaceId));
    }),

  ensureForRepo: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string(),
        repoFullName: z.string(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await assertCan(
        ctx.session.user.id,
        "member",
        "workspace",
        input.workspaceId
      );

      const [, repoName] = input.repoFullName.split("/");
      const slug = repoName.toLowerCase();

      // Check if it already exists
      const [existing] = await db
        .select()
        .from(project)
        .where(
          and(
            eq(project.workspaceId, input.workspaceId),
            eq(project.slug, slug)
          )
        )
        .limit(1);

      if (existing) {
        return existing;
      }

      // Otherwise, create it
      const [created] = await db
        .insert(project)
        .values({
          workspaceId: input.workspaceId,
          name: repoName,
          slug: slug,
          description:
            input.description ?? `Project synced for ${input.repoFullName}`,
          createdBy: ctx.session.user.id,
        })
        .returning();

      return created;
    }),
});
