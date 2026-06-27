import OpenAI from "openai";

const openai = new OpenAI();

type ModerationResult = { allowed: true } | { allowed: false; reason: string };

export async function moderateMessage(text: string): Promise<ModerationResult> {
  const response = await openai.moderations.create({
    model: "omni-moderation-latest",
    input: text,
  });

  const result = response.results[0];

  if (result.flagged) {
    const flaggedCategories = Object.entries(result.categories)
      .filter(([, flagged]) => flagged)
      .map(([category]) => category)
      .join(", ");

    return {
      allowed: false,
      reason: `Message flagged for: ${flaggedCategories}. Please keep the conversation focused on your feature request.`,
    };
  }

  return { allowed: true };
}

const OFF_TOPIC_PATTERNS = [
  // Personal info fishing
  /\b(your name|who are you|how old|where are you|are you human|are you an ai)\b/i,
  // Personal advice
  /\b(my relationship|my health|my family|my finances|personal advice)\b/i,
  // Competitor / unrelated AI
  /\b(chatgpt|gemini|claude|write me a poem|tell me a joke|play a game)\b/i,
  // Political / controversial
  /\b(politics|election|religion|abortion|gun control)\b/i,
];

export function isOffTopic(text: string): ModerationResult {
  for (const pattern of OFF_TOPIC_PATTERNS) {
    if (pattern.test(text)) {
      return {
        allowed: false,
        reason:
          "I can only help with feature requests and product requirements. Please describe the feature you want to build.",
      };
    }
  }
  return { allowed: true };
}

/**
 * Run both layers. Returns first failure found.
 * Call this before every user message in the chat agent.
 */
export async function validateUserMessage(
  text: string
): Promise<ModerationResult> {
  const offTopic = isOffTopic(text);
  if (!offTopic.allowed) return offTopic;

  const moderation = await moderateMessage(text);
  if (!moderation.allowed) return moderation;

  return { allowed: true };
}
