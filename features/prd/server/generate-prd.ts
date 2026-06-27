import { inngest } from "@/features/inngest/client";
import { db } from "@/lib/db";
import {
  featureRequest,
  inngestWorkflow,
  prd,
  tokenUsage,
  conversationMessage,
} from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { REASONING_MODEL } from "@/features/ai/config";
import { PRD_GENERATION_SYSTEM_PROMPT } from "../prompts/prd-generation";
import { PrdSchema } from "../types";

export const generatePrdFunction = inngest.createFunction(
  { id: "generate-prd" },
  { event: "prd/generate.requested" },
  async ({ event, step, runId }) => {
    const { featureRequestId, workspaceId } = event.data;

    // 1. Fetch context
    const context = await step.run("fetch-context", async () => {
      const [fr] = await db
        .select()
        .from(featureRequest)
        .where(eq(featureRequest.id, featureRequestId))
        .limit(1);

      const messages = await db
        .select()
        .from(conversationMessage)
        .where(eq(conversationMessage.featureRequestId, featureRequestId))
        .orderBy(conversationMessage.createdAt);

      return { fr, messages };
    });

    if (!context.fr) throw new Error("Feature request not found");

    // 2. Update status generating
    await step.run("update-status-generating", async () => {
      await db
        .update(featureRequest)
        .set({ status: "prd_generating" })
        .where(eq(featureRequest.id, featureRequestId));

      const [queued] = await db
        .select()
        .from(inngestWorkflow)
        .where(
          and(
            eq(inngestWorkflow.featureRequestId, featureRequestId),
            eq(inngestWorkflow.type, "prd_gen"),
            eq(inngestWorkflow.status, "queued")
          )
        )
        .limit(1);

      if (queued) {
        await db
          .update(inngestWorkflow)
          .set({ status: "running", inngestRunId: runId })
          .where(eq(inngestWorkflow.id, queued.id));
      } else {
        await db.insert(inngestWorkflow).values({
          featureRequestId,
          workspaceId,
          type: "prd_gen",
          status: "running",
          inngestRunId: runId,
        });
      }
    });

    // 3. Generate PRD Content
    const generated = await step.run("generate-prd-content", async () => {
      const conversationText = context.messages
        .map((m) => `${m.role}: ${m.content}`)
        .join("\n");

      const prompt = `Original request: ${context.fr.rawInput}\n\nConversation:\n${conversationText}`;

      const { object, usage } = await generateObject({
        model: openai(REASONING_MODEL),
        schema: PrdSchema,
        system: PRD_GENERATION_SYSTEM_PROMPT,
        prompt,
      });

      return { prd: object, tokensUsed: usage.totalTokens };
    });

    // 4. Save PRD
    await step.run("save-prd", async () => {
      await db.insert(prd).values({
        featureRequestId,
        workspaceId,
        ...generated.prd,
        status: "draft",
      });

      await db.insert(tokenUsage).values({
        workspaceId,
        featureRequestId,
        action: "prd_generation",
        tokensUsed: generated.tokensUsed,
      });

      await db
        .update(featureRequest)
        .set({ status: "prd_ready" })
        .where(eq(featureRequest.id, featureRequestId));

      // Update inngest workflow status to completed
      const latestWorkflow = await db
        .select()
        .from(inngestWorkflow)
        .where(eq(inngestWorkflow.featureRequestId, featureRequestId))
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
