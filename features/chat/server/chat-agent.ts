import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";
import { FAST_MODEL, GENERATION_TEMPERATURE } from "@/features/ai/config";
import { validateUserMessage } from "./guardrails";
import { decideReadiness } from "./decide-readiness";
import { CLARIFICATION_SYSTEM_PROMPT } from "../prompts/clarification";
import { db } from "@/lib/db";
import { conversationMessage } from "@/lib/db/schema";

type Message = { role: "user" | "assistant"; content: string };

type ChatAgentInput = {
  featureRequestId: string;
  messages: Message[];
  rawInput: string;
};

export async function runChatAgent(input: ChatAgentInput) {
  const latestUserMessage = input.messages.findLast((m) => m.role === "user");
  if (latestUserMessage) {
    const guard = await validateUserMessage(latestUserMessage.content);
    if (!guard.allowed) {
      return {
        blocked: true,
        reason: guard.reason,
        readyForPrd: false,
        stream: null,
      };
    }
  }

  const readiness = await decideReadiness(input.rawInput, input.messages);

  const stream = streamText({
    model: openai(FAST_MODEL),
    temperature: GENERATION_TEMPERATURE,
    system: CLARIFICATION_SYSTEM_PROMPT,
    messages: input.messages,
    onFinish: async ({ text }) => {
      // Persist the assistant's full reply once streaming completes, so it
      // survives a reload (the route only saves the user's turn up front).
      if (text.trim()) {
        await db.insert(conversationMessage).values({
          featureRequestId: input.featureRequestId,
          role: "assistant",
          content: text,
        });
      }
    },
  });

  return { blocked: false, readyForPrd: readiness.ready, stream };
}
