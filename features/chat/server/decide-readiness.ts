import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { FAST_MODEL } from "@/features/ai/config";

const ReadinessSchema = z.object({
  ready: z.boolean(),
  reason: z.string(),
});

type Message = { role: "user" | "assistant"; content: string };

export async function decideReadiness(rawInput: string, messages: Message[]) {
  const { object } = await generateObject({
    model: openai(FAST_MODEL),
    schema: ReadinessSchema,
    system: `You decide if a product manager has gathered enough information to write a PRD.
A good PRD needs: problem statement, target users, core functionality, success criteria.
Return ready: true only when all four are reasonably clear from the conversation.`,
    prompt: `Original request: ${rawInput}\n\nConversation so far:\n${messages.map((m) => `${m.role}: ${m.content}`).join("\n")}`,
  });

  return object;
}
