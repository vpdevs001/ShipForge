import { inngest } from "@/features/inngest/client";
import { db } from "@/lib/db";
import {
  pullRequest,
  repoSync,
  prd,
  review,
  reviewIssue,
  task,
  featureRequest,
  tokenUsage,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getPullRequestFiles } from "./pr-files";
import { generateReview } from "./generate-review";
import { postPrComment } from "./post-pr-comment";
import { chunkPrFiles } from "../utils/chunk-code";
import {
  buildPrNamespace,
  saveChunksToPinecone,
  searchPrContext,
} from "./vector";
import { buildRepoNamespace } from "@/features/repo-sync/server/repo-sync";

export const reviewPullRequest = inngest.createFunction(
  { id: "review-pull-request", triggers: { event: "github/pr.received" } },
  async ({ event, step }) => {
    const pullRequestId = event.data.pullRequestId;

    const pullRequestRecord = await step.run("mark-processing", async () => {
      const [prRecord] = await db
        .update(pullRequest)
        .set({ reviewStatus: "processing" })
        .where(eq(pullRequest.id, pullRequestId))
        .returning();
      return prRecord;
    });

    const chunks = await step.run("breakdown-code", async () => {
      const files = await getPullRequestFiles(
        pullRequestRecord.installationId,
        pullRequestRecord.repoFullName,
        pullRequestRecord.prNumber
      );

      return chunkPrFiles(pullRequestRecord.prNumber, files);
    });

    if (chunks.length === 0) {
      await step.run("mark-reviewed-no-code", async () => {
        await db
          .update(pullRequest)
          .set({ reviewStatus: "reviewed", reviewedAt: new Date() })
          .where(eq(pullRequest.id, pullRequestId));
      });

      return { pullRequestId, status: "reviewed", reason: "no code to review" };
    }

    const namespace = buildPrNamespace(
      pullRequestRecord.repoFullName,
      pullRequestRecord.prNumber
    );

    await step.run("save-vectors-to-pinecone", async () => {
      await saveChunksToPinecone(namespace, chunks);
    });

    await step.sleep("wait-for-vectors-to-index", "10s");

    const repoContextSnippets = await step.run(
      "search-repo-context",
      async () => {
        const [repoSyncData] = await db
          .select()
          .from(repoSync)
          .where(eq(repoSync.repoFullName, pullRequestRecord.repoFullName))
          .limit(1);

        if (!repoSyncData || repoSyncData.status !== "synced") {
          return [];
        }

        const repoNamespace = buildRepoNamespace(
          pullRequestRecord.repoFullName
        );
        return searchPrContext(repoNamespace, pullRequestRecord.title);
      }
    );

    const prdContext = await step.run("fetch-prd-context", async () => {
      if (pullRequestRecord.featureRequestId) {
        const [prdRow] = await db
          .select()
          .from(prd)
          .where(eq(prd.featureRequestId, pullRequestRecord.featureRequestId))
          .limit(1);
        return prdRow || null;
      }
      return null;
    });

    const reviewResult = await step.run("generate-ai-review", async () => {
      const contextSnippets = await searchPrContext(
        namespace,
        pullRequestRecord.title
      );

      return generateReview({
        repoFullName: pullRequestRecord.repoFullName,
        title: pullRequestRecord.title,
        contextSnippets,
        repoContextSnippets,
        prdContext,
      });
    });

    await step.run("save-review-data", async () => {
      if (pullRequestRecord.featureRequestId && prdContext) {
        const [reviewRow] = await db
          .insert(review)
          .values({
            pullRequestId: pullRequestRecord.id,
            featureRequestId: pullRequestRecord.featureRequestId,
            prdId: prdContext.id,
            workspaceId: pullRequestRecord.workspaceId,
            status: "completed",
            verdict: reviewResult.verdict,
            tokensUsed: reviewResult.tokensUsed,
          })
          .returning();

        if (reviewResult.issues.length > 0) {
          const insertedIssues = await db
            .insert(reviewIssue)
            .values(
              reviewResult.issues.map((issue) => ({
                reviewId: reviewRow.id,
                featureRequestId: pullRequestRecord.featureRequestId!,
                workspaceId: pullRequestRecord.workspaceId,
                category: issue.category,
                severity: issue.severity,
                title: issue.title,
                description: issue.description,
                suggestion: issue.suggestion,
                filePath: issue.filePath ?? null,
                lineNumber: issue.lineNumber ?? null,
              }))
            )
            .returning();

          const blockingIssues = insertedIssues.filter(
            (i) => i.severity === "blocking"
          );

          if (blockingIssues.length > 0) {
            await db.insert(task).values(
              blockingIssues.map((issue, index) => ({
                prdId: prdContext.id,
                featureRequestId: pullRequestRecord.featureRequestId!,
                workspaceId: pullRequestRecord.workspaceId,
                reviewIssueId: issue.id,
                source: "review" as const,
                title: issue.title,
                description: `${issue.description}\n\nSuggestion: ${issue.suggestion}`,
                priority: "high" as const,
                status: "todo" as const,
                order: index + 1,
              }))
            );

            await db
              .update(featureRequest)
              .set({ status: "fix_needed" })
              .where(eq(featureRequest.id, pullRequestRecord.featureRequestId));
          }
        }

        await db.insert(tokenUsage).values({
          workspaceId: pullRequestRecord.workspaceId,
          featureRequestId: pullRequestRecord.featureRequestId,
          action: "ai_review",
          tokensUsed: reviewResult.tokensUsed,
        });
      }
    });

    await step.run("post-pr-comment", async () => {
      await postPrComment(
        pullRequestRecord.installationId,
        pullRequestRecord.repoFullName,
        pullRequestRecord.prNumber,
        reviewResult.text
      );
    });

    await step.run("mark-reviewed", async () => {
      await db
        .update(pullRequest)
        .set({
          reviewStatus: "reviewed",
          reviewedAt: new Date(),
        })
        .where(eq(pullRequest.id, pullRequestId));
    });

    return { pullRequestId, status: "reviewed" };
  }
);
