/**
 * AI Guardrails
 *
 * Two-layer validation around every AI call:
 *
 *  1. Input guardrail  — sanitises and caps the prompt before it reaches the API
 *  2. Output guardrail — validates the model's response before it propagates downstream
 */

import { MAX_INPUT_CHARS, MIN_OUTPUT_CHARS } from "./config";

const REFUSAL_PHRASES = [
  "i'm sorry, but i can't",
  "i cannot assist",
  "i'm unable to",
  "as an ai language model, i cannot",
  "i'm not able to",
  "i cannot provide",
  "i'm afraid i can't",
  "i can't help with",
  "i won't be able to",
];

export class GuardrailInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GuardrailInputError";
  }
}

export class GuardrailOutputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GuardrailOutputError";
  }
}

/**
 * Validates and sanitises a prompt before sending to the model.
 * Trims, rejects empty prompts, truncates oversized ones.
 *
 * @throws {GuardrailInputError} when the prompt is empty
 */
export function validateInput(prompt: string): string {
  const trimmed = prompt.trim();

  if (!trimmed) {
    throw new GuardrailInputError("Prompt must not be empty.");
  }

  if (trimmed.length > MAX_INPUT_CHARS) {
    return (
      trimmed.slice(0, MAX_INPUT_CHARS) +
      "\n\n[... content truncated to fit context window ...]"
    );
  }

  return trimmed;
}

/**
 * Validates raw model output before it propagates to callers.
 * Rejects empty responses, refusals, and suspiciously short outputs.
 *
 * Uses `includes` (not `startsWith`) so mid-response refusals are caught too.
 *
 * @throws {GuardrailOutputError} when output fails validation
 */
export function validateOutput(text: string): string {
  const trimmed = text.trim();

  if (!trimmed) {
    throw new GuardrailOutputError(
      "Model returned an empty response. This may indicate a transient API issue."
    );
  }

  const lower = trimmed.toLowerCase();
  for (const phrase of REFUSAL_PHRASES) {
    if (lower.includes(phrase)) {
      throw new GuardrailOutputError(
        `Model refused to generate a response: "${trimmed.slice(0, 120)}..."`
      );
    }
  }

  if (trimmed.length < MIN_OUTPUT_CHARS) {
    throw new GuardrailOutputError(
      `Model response too short to be useful (${trimmed.length} chars, minimum ${MIN_OUTPUT_CHARS}).`
    );
  }

  return trimmed;
}
