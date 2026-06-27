import { inngest } from "@/features/inngest/client";
import { db } from "@/lib/db";
import {
  featureRequest,
  inngestWorkflow,
  prd,
  tokenUsage,
  task,
} from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { REASONING_MODEL } from "@/features/ai/config";
import { TASK_GENERATION_SYSTEM_PROMPT } from "../prompts/task-generation";
import { TaskListSchema } from "../types";

export const generateTasksFunction = inngest.createFunction(
  { id: "generate-tasks" },
  { event: "tasks/generate.requested" },
  async ({ event, step, runId }) => {
    const { prdId, featureRequestId, workspaceId } = event.data;

    // 1. Fetch PRD Context & Update Workflow to Running
    const context = await step.run("fetch-prd", async () => {
      const [prdData] = await db
        .select()
        .from(prd)
        .where(eq(prd.id, prdId))
        .limit(1);

      const [queued] = await db
        .select()
        .from(inngestWorkflow)
        .where(
          and(
            eq(inngestWorkflow.featureRequestId, featureRequestId),
            eq(inngestWorkflow.type, "task_gen"),
            eq(inngestWorkflow.status, "queued")
          )
        )
        .limit(1);

      if (queued) {
        await db
          .update(inngestWorkflow)
          .set({ status: "running", inngestRunId: runId })
          .where(eq(inngestWorkflow.id, queued.id));
      }

      return { prdData };
    });

    if (!context.prdData) throw new Error("PRD not found");

    // 2. Generate task list
    const generated = await step.run("generate-task-list", async () => {
      const prdText = JSON.stringify(context.prdData, null, 2);
      const prompt = `Here is the PRD:\n\n${prdText}`;

      const { object, usage } = await generateObject({
        model: openai(REASONING_MODEL),
        schema: TaskListSchema,
        system: TASK_GENERATION_SYSTEM_PROMPT,
        prompt,
      });

      return { tasks: object, tokensUsed: usage.totalTokens };
    });

    // 3. Save tasks
    await step.run("save-tasks", async () => {
      if (generated.tasks.length > 0) {
        await db.insert(task).values(
          generated.tasks.map((t) => ({
            prdId,
            featureRequestId,
            workspaceId,
            source: "prd" as const,
            status: "backlog" as const,
            priority: t.priority,
            order: t.order,
            title: t.title,
            description: t.description,
          }))
        );
      }

      await db.insert(tokenUsage).values({
        workspaceId,
        featureRequestId,
        action: "task_generation",
        tokensUsed: generated.tokensUsed,
      });

      await db
        .update(featureRequest)
        .set({ status: "in_development" })
        .where(eq(featureRequest.id, featureRequestId));

      // Update inngest workflow if any
      const latestWorkflow = await db
        .select()
        .from(inngestWorkflow)
        .where(
          and(
            eq(inngestWorkflow.featureRequestId, featureRequestId),
            eq(inngestWorkflow.type, "task_gen")
          )
        )
        .orderBy(desc(inngestWorkflow.createdAt))
        .limit(1);

      if (latestWorkflow.length > 0) {
        await db
          .update(inngestWorkflow)
          .set({ status: "completed" })
          .where(eq(inngestWorkflow.id, latestWorkflow[0].id));
      }
    });

    return { success: true };
  }
);
