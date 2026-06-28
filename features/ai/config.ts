/**
 * Centralized AI configuration.
 * All model choices and limits live here — change once, applies everywhere.
 */

/**
 * Model for PR code review — needs strong reasoning for security/perf analysis.
 * gpt-4o is the right default; swap to "o3" for maximum quality if budget allows.
 */
export const REVIEW_MODEL = "gpt-4o" as const;

/**
 * Model for lighter tasks: clarification questions, task generation, PRD drafts.
 * gpt-4o-mini is fast and cheap enough for these.
 */
export const FAST_MODEL = "gpt-4o-mini" as const;

/**
 * Model for complex reasoning tasks: PRD generation, task generation.
 * Uses gpt-4o for high-quality structured output.
 */
export const REASONING_MODEL = "gpt-4o" as const;

/** Lower temperature = more deterministic, focused output. Good for reviews. */
export const REVIEW_TEMPERATURE = 0.2;

/** Slightly higher for PRD/task generation where some creativity helps. */
export const GENERATION_TEMPERATURE = 0.4;

/**
 * Hard cap on tokens the model may generate per review.
 * Keeps costs predictable and reviews focused.
 */
export const REVIEW_MAX_TOKENS = 1500;

/** Token cap for PRD generation — needs more room than a review. */
export const GENERATION_MAX_TOKENS = 3000;

/**
 * Hard cap on characters sent to the model in a single call.
 * ~120k chars ≈ ~30k tokens — well within gpt-4o's 128k context window.
 */
export const MAX_INPUT_CHARS = 120_000;

/** Minimum character length for a valid, useful review response. */
export const MIN_OUTPUT_CHARS = 50;
