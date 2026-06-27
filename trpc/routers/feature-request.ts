import { z } from "zod";
import { router, protectedProcedure } from "@/trpc/init";
import { db } from "@/lib/db";
import { featureRequest } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { assertCan, checkCan } from "@/lib/rebac";
import { createFeatureRequest } from "@/features/feature-requests/server/create-feature-request";

export const featureRequestRouter = router({
  create: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string(),
        projectId: z.string(),
        title: z.string(),
        rawInput: z.string(),
        source: z.enum(["form", "email", "ticket"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Must be workspace member to create
      await assertCan(
        ctx.session.user.id,
        "member",
        "workspace",
        input.workspaceId
      );

      const fr = await createFeatureRequest({
        workspaceId: input.workspaceId,
        projectId: input.projectId,
        creatorId: ctx.session.user.id,
        title: input.title,
        rawInput: input.rawInput,
        source: input.source,
      });

      return { featureRequestId: fr.id };
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const isCreator = await checkCan(
        ctx.session.user.id,
        "creator",
        "feature_request",
        input.id
      );

      if (!isCreator) {
        // Fallback: Check if they are a workspace member of the workspace owning the FR
        const [fr] = await db
          .select({ workspaceId: featureRequest.workspaceId })
          .from(featureRequest)
          .where(eq(featureRequest.id, input.id))
          .limit(1);

        if (fr) {
          await assertCan(
            ctx.session.user.id,
            "member",
            "workspace",
            fr.workspaceId
          );
        } else {
          throw new Error("Not found");
        }
      }

      // TODO: Include prd, tasks, pullRequests, reviews when we have standard fetching logic
      const [fullFr] = await db
        .select()
        .from(featureRequest)
        .where(eq(featureRequest.id, input.id))
        .limit(1);

      return fullFr;
    }),

  list: protectedProcedure
    .input(z.object({ projectId: z.string(), workspaceId: z.string() }))
    .query(async ({ ctx, input }) => {
      await assertCan(
        ctx.session.user.id,
        "member",
        "workspace",
        input.workspaceId
      );

      const list = await db
        .select()
        .from(featureRequest)
        .where(
          and(
            eq(featureRequest.projectId, input.projectId),
            eq(featureRequest.workspaceId, input.workspaceId)
          )
        );

      return list;
    }),
});
