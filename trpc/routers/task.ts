import { z } from "zod";
import { router, protectedProcedure } from "@/trpc/init";
import { db } from "@/lib/db";
import { task } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { assertCan } from "@/lib/rebac";

export const taskRouter = router({
  listByFeatureRequest: protectedProcedure
    .input(z.object({ featureRequestId: z.string() }))
    .query(async ({ ctx, input }) => {
      await assertCan(
        ctx.session.user.id,
        "creator",
        "feature_request",
        input.featureRequestId
      );

      const tasks = await db
        .select()
        .from(task)
        .where(eq(task.featureRequestId, input.featureRequestId))
        .orderBy(task.order);

      return tasks;
    }),

  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum(["backlog", "todo", "in_progress", "done"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [t] = await db
        .select({ featureRequestId: task.featureRequestId })
        .from(task)
        .where(eq(task.id, input.id))
        .limit(1);

      if (!t) throw new Error("Task not found");
      await assertCan(
        ctx.session.user.id,
        "creator",
        "feature_request",
        t.featureRequestId
      );

      await db
        .update(task)
        .set({ status: input.status })
        .where(eq(task.id, input.id));

      return { ok: true };
    }),
});
