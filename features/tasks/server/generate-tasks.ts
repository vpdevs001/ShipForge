import { inngest } from "@/features/inngest/client";
import { tasksGenerateRequested } from "@/features/inngest/events";
import { db } from "@/lib/db";
import {
  featureRequest,
  inngestWorkflow,
  prd,
  tokenUsage,
  task,
} from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { generateText, Output } from "ai";
import { openai } from "@ai-sdk/openai";
import { REASONING_MODEL } from "@/features/ai/config";
import { TASK_GENERATION_SYSTEM_PROMPT } from "../prompts/task-generation";
import { TaskSchema } from "../types";

export const generateTasksFunction = inngest.createFunction(
  { id: "generate-tasks", triggers: [tasksGenerateRequested] },
  async ({ event, step }) => {
    const { prdId, featureRequestId, workspaceId } = event.data;

    // 1. Fetch PRD + update workflow to running
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
          .set({ status: "running", inngestRunId: event.id })
          .where(eq(inngestWorkflow.id, queued.id));
      }

      return { prdData };
    });

    if (!context.prdData) throw new Error("PRD not found");

    // 2. Generate task list
    const generated = await step.run("generate-task-list", async () => {
      const prdText = JSON.stringify(context.prdData, null, 2);
      const prompt = `Here is the PRD:\n\n${prdText}`;

      const { output, usage } = await generateText({
        model: openai(REASONING_MODEL),
        output: Output.array({ element: TaskSchema }),
        system: TASK_GENERATION_SYSTEM_PROMPT,
        prompt,
      });

      return { tasks: output, tokensUsed: usage.totalTokens ?? 0 };
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

      const [latestWorkflow] = await db
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

      if (latestWorkflow) {
        await db
          .update(inngestWorkflow)
          .set({ status: "completed" })
          .where(eq(inngestWorkflow.id, latestWorkflow.id));
      }
    });

    return { success: true };
  }
);
