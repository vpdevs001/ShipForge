import { z } from "zod";
import { router, protectedProcedure } from "@/trpc/init";
import { db } from "@/lib/db";
import { featureRequest, inngestWorkflow, prd } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { assertCan } from "@/lib/rebac";
import { inngest } from "@/features/inngest/client";

export const prdRouter = router({
  generate: protectedProcedure
    .input(z.object({ featureRequestId: z.string(), workspaceId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await assertCan(
        ctx.session.user.id,
        "creator",
        "feature_request",
        input.featureRequestId
      );

      await inngest.send({
        name: "prd/generate.requested",
        data: {
          featureRequestId: input.featureRequestId,
          workspaceId: input.workspaceId,
        },
      });

      const [workflow] = await db
        .insert(inngestWorkflow)
        .values({
          featureRequestId: input.featureRequestId,
          workspaceId: input.workspaceId,
          type: "prd_gen",
          status: "queued",
          inngestRunId: `pending-${crypto.randomUUID()}`,
        })
        .returning();

      return { workflowId: workflow.id };
    }),

  getByFeatureRequest: protectedProcedure
    .input(z.object({ featureRequestId: z.string() }))
    .query(async ({ ctx, input }) => {
      await assertCan(
        ctx.session.user.id,
        "creator",
        "feature_request",
        input.featureRequestId
      );

      const [prdData] = await db
        .select()
        .from(prd)
        .where(eq(prd.featureRequestId, input.featureRequestId))
        .orderBy(desc(prd.createdAt))
        .limit(1);

      return prdData || null;
    }),

  approve: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [prdData] = await db
        .select()
        .from(prd)
        .where(eq(prd.id, input.id))
        .limit(1);

      if (!prdData) throw new Error("PRD not found");

      await assertCan(
        ctx.session.user.id,
        "creator",
        "feature_request",
        prdData.featureRequestId
      );

      await db.update(prd).set({ status: "final" }).where(eq(prd.id, input.id));

      await db
        .update(featureRequest)
        .set({ status: "planning" })
        .where(eq(featureRequest.id, prdData.featureRequestId));

      await db.insert(inngestWorkflow).values({
        featureRequestId: prdData.featureRequestId,
        workspaceId: prdData.workspaceId,
        type: "task_gen",
        status: "queued",
        inngestRunId: `pending-${crypto.randomUUID()}`,
      });

      await inngest.send({
        name: "tasks/generate.requested",
        data: {
          prdId: prdData.id,
          featureRequestId: prdData.featureRequestId,
          workspaceId: prdData.workspaceId,
        },
      });

      return { ok: true };
    }),
});
