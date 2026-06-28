import { generateText, Output } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import {
  REVIEW_MODEL,
  REVIEW_TEMPERATURE,
  REVIEW_MAX_TOKENS,
  FAST_MODEL,
} from "../../ai/config";
import { validateInput, validateOutput } from "../../ai/guardrails";
import { PrdContent } from "../../prd/types";

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

export type ReviewInput = {
  repoFullName: string;
  title: string;
  contextSnippets: string[];
  repoContextSnippets: string[];
  prdContext: PrdContent | null;
};

const IssueSchema = z.object({
  issues: z.array(
    z.object({
      category: z.enum([
        "requirement",
        "security",
        "performance",
        "edge_case",
        "code_quality",
      ]),
      severity: z.enum(["blocking", "non_blocking"]),
      title: z.string(),
      description: z.string(),
      suggestion: z.string(),
      filePath: z.string().optional(),
      lineNumber: z.number().optional(),
    })
  ),
  verdict: z.enum(["pass", "fail", "needs_changes"]),
});

export type ReviewResult = {
  text: string;
  tokensUsed: number;
  issues: z.infer<typeof IssueSchema>["issues"];
  verdict: z.infer<typeof IssueSchema>["verdict"];
};

function buildPrdSection(prd: PrdContent | null): string {
  if (!prd) return "";

  return `
## Product Requirements Document

You MUST evaluate the code changes against these requirements:

**Problem being solved:** ${prd.problemStatement}

**Goals:**
${prd.goals.map((g) => `- ${g}`).join("\n")}

**Acceptance Criteria:**
${prd.acceptanceCriteria.map((c) => `- ${c}`).join("\n")}

**Edge Cases to verify:**
${prd.edgeCases.map((e) => `- ${e}`).join("\n")}

For each acceptance criterion, explicitly state whether the implementation satisfies it, partially satisfies it, or misses it entirely.`;
}

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
  const prdSection = buildPrdSection(input.prdContext);

  const fullSystemPrompt = SYSTEM_PROMPT + prdSection;

  const userPrompt = validateInput(
    `Repository: ${input.repoFullName}
Pull request title: ${input.title}

Code changes:

${context}${repoContextSection}`
  );

  // Call 1: Markdown text
  const { text, usage: textUsage } = await generateText({
    model: openai(REVIEW_MODEL),
    temperature: REVIEW_TEMPERATURE,
    maxOutputTokens: REVIEW_MAX_TOKENS,
    system: fullSystemPrompt,
    prompt: userPrompt,
  });

  const validatedText = validateOutput(text);

  // Call 2: Structured output
  const { output: issueOutput, usage: objectUsage } = await generateText({
    model: openai(FAST_MODEL),
    output: Output.object({ schema: IssueSchema }),
    system:
      "You extract structured issues and a final verdict from a markdown code review.",
    prompt: `Review Text:\n${validatedText}\n\nExtract the issues and verdict. If there are no issues, return an empty array and 'pass'. If there are blocking issues, verdict is 'needs_changes'.`,
  });

  return {
    text: validatedText,
    tokensUsed: (textUsage.totalTokens ?? 0) + (objectUsage.totalTokens ?? 0),
    issues: issueOutput.issues,
    verdict: issueOutput.verdict,
  };
}
