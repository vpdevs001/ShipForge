import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { REVIEW_MODEL, REVIEW_TEMPERATURE, REVIEW_MAX_TOKENS } from "../../ai/config";
import { validateInput, validateOutput } from "../../ai/guardrails";

const SYSTEM_PROMPT = `You are an expert code reviewer with deep knowledge of software engineering best practices, security, and performance optimization.

Review the provided unified diff chunks and write a concise, actionable pull request review in markdown.

## Review Checklist

Analyze the changes across these dimensions (only mention what's relevant):

- **Correctness** — Bugs, logic errors, off-by-one errors, incorrect assumptions
- **Security** — Injection risks, auth issues, exposed secrets, unsafe deserialization, unvalidated input
- **Performance** — Unnecessary loops, missing indexes, N+1 queries, memory leaks
- **Reliability** — Unhandled errors/edge cases, missing null checks, race conditions
- **Readability** — Naming clarity, overly complex logic, missing comments on non-obvious code
- **Maintainability** — Tight coupling, duplication, violations of SOLID/DRY principles

## Output Format

Start with a **one-line summary** of the overall change quality.

Then use this structure if there are findings:

### ✅ What looks good
(skip if nothing notable)

### ⚠️ Suggestions
(non-blocking improvements)

### 🚨 Issues
(bugs, security problems, or breaking changes that must be fixed)

## Guidelines

- Be specific: reference relevant code, function names, or line context
- Be constructive: explain *why* something is a problem and suggest a fix
- Be proportional: don't nitpick minor style issues if there are real bugs
- If the diff looks clean with no concerns, say so clearly in 1–2 sentences — do not invent problems
- Tailor feedback to the repository language and conventions visible in the diff`;

type ReviewInput = {
  repoFullName: string;
  title: string;
  /** Chunks retrieved from the PR's Pinecone namespace */
  contextSnippets: string[];
  /** Optional chunks from repo-sync namespace (full codebase context) */
  repoContextSnippets: string[];
};

type ReviewResult = {
  text: string;
  /** Total tokens consumed — written to token_usage table by the caller */
  tokensUsed: number;
};

function buildRepoContextSection(snippets: string[]): string {
  if (snippets.length === 0) return "";

  return `

Related code from the repository (for context only, not part of the change):

${snippets.join("\n\n---\n\n")}`;
}

export async function generateReview(
  input: ReviewInput
): Promise<ReviewResult> {
  const context = input.contextSnippets.join("\n\n---\n\n");
  const repoContextSection = buildRepoContextSection(input.repoContextSnippets);

  const userPrompt = validateInput(
    `Repository: ${input.repoFullName}
Pull request title: ${input.title}

Code changes:

${context}${repoContextSection}`
  );

  const { text, usage } = await generateText({
    model: openai(REVIEW_MODEL),
    temperature: REVIEW_TEMPERATURE,
    maxOutputTokens: REVIEW_MAX_TOKENS,
    system: SYSTEM_PROMPT,
    prompt: userPrompt,
  });

  const validated = validateOutput(text);

  return {
    text: validated,
    tokensUsed: usage.totalTokens ?? 0,
  };
}
