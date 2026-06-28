import { generateText, Output } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { FAST_MODEL } from "@/features/ai/config";

const ReadinessSchema = z.object({
  ready: z.boolean(),
  reason: z.string(),
});

type Message = { role: "user" | "assistant"; content: string };

export async function decideReadiness(rawInput: string, messages: Message[]) {
  const { output } = await generateText({
    model: openai(FAST_MODEL),
    output: Output.object({ schema: ReadinessSchema }),
    system: `You decide if a product manager has gathered enough information to write a PRD.\nA good PRD needs: problem statement, target users, core functionality, success criteria.\nReturn ready: true only when all four are reasonably clear from the conversation.`,
    prompt: `Original request: ${rawInput}\n\nConversation so far:\n${messages.map((m) => `${m.role}: ${m.content}`).join("\n")}`,
  });

  return output;
}
