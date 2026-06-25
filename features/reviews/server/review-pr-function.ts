import { inngest } from "@/features/inngest/client";
import { db } from "@/lib/db";
import { pullRequest, repoSync } from "@/lib/db/schema";
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
        .set({ status: "processing" })
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

      // Turn unified diffs into fixed-size chunks for embedding
      return chunkPrFiles(pullRequestRecord.prNumber, files);
    });

    if (chunks.length === 0) {
      await step.run("mark-reviewed-no-code", async () => {
        await db
          .update(pullRequest)
          .set({ status: "reviewed" })
          .where(eq(pullRequest.id, pullRequestId));
      });

      return { pullRequestId, status: "reviewed", reason: "no code to review" };
    }

    // PR namespace isolates this diff from other PRs and from repo-wide sync data
    const namespace = buildPrNamespace(
      pullRequestRecord.repoFullName,
      pullRequestRecord.prNumber
    );

    await step.run("save-vectors-to-pinecone", async () => {
      await saveChunksToPinecone(namespace, chunks);
    });

    // Pinecone needs a short delay before new vectors appear in search results
    await step.sleep("wait-for-vectors-to-index", "10s");

    // Extra context from the on-demand codebase sync, when the repo was synced
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

    const review = await step.run("generate-ai-review", async () => {
      // Search within this PR's namespace for chunks related to the PR title
      const contextSnippets = await searchPrContext(
        namespace,
        pullRequestRecord.title
      );

      return generateReview({
        repoFullName: pullRequestRecord.repoFullName,
        title: pullRequestRecord.title,
        contextSnippets,
        repoContextSnippets,
      });
    });

    await step.run("post-pr-comment", async () => {
      await postPrComment(
        pullRequestRecord.installationId,
        pullRequestRecord.repoFullName,
        pullRequestRecord.prNumber,
        review
      );
    });

    await step.run("mark-reviewed", async () => {
      await db
        .update(pullRequest)
        .set({
          status: "reviewed",
          reviewComment: review,
          reviewedAt: new Date(),
        })
        .where(eq(pullRequest.id, pullRequestId));
    });

    return { pullRequestId, status: "reviewed" };
  }
);
