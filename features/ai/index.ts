export { generateReview } from "../reviews/server/generate-review";
export {
  REVIEW_MODEL,
  FAST_MODEL,
  REVIEW_TEMPERATURE,
  GENERATION_TEMPERATURE,
  REVIEW_MAX_TOKENS,
  GENERATION_MAX_TOKENS,
} from "./config";
export {
  validateInput,
  validateOutput,
  GuardrailInputError,
  GuardrailOutputError,
} from "./guardrails";

// Note: no client export — AI SDK's openai() helper is instantiated per-call
// and handles connection pooling internally. Import directly from "@ai-sdk/openai"
// in any file that needs to call a model other than for reviews.
