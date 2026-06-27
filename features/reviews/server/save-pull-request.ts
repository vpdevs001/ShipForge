import { PullRequestWebhookPayload } from "@/features/github/server/webhook-handler";
import { db } from "@/lib/db";
import {
  pullRequest,
  githubInstallation,
  featureRequest,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { findFeatureRequestId } from "@/features/feature-requests/server/link-pull-request";

function getAuthorLogin(user: { login: string } | null): string | null {
  if (!user) {
    return null;
  }
  return user.login;
}

export async function savePullRequest(payload: PullRequestWebhookPayload) {
  const repoFullName = payload.repository.full_name;
  const prNumber = payload.pull_request.number;

  // Look up workspaceId from the installation
  const [installation] = await db
    .select({ workspaceId: githubInstallation.workspaceId })
    .from(githubInstallation)
    .where(eq(githubInstallation.installationId, payload.installation.id))
    .limit(1);

  if (!installation) throw new Error("Installation not found");
  const workspaceId = installation.workspaceId;

  const [pr] = await db
    .insert(pullRequest)
    .values({
      workspaceId,
      installationId: payload.installation.id,
      repoFullName,
      prNumber,
      title: payload.pull_request.title,
      body: (payload.pull_request as { body?: string | null }).body ?? null,
      authorLogin: getAuthorLogin(payload.pull_request.user),
      headSha: payload.pull_request.head.sha,
      baseBranch: payload.pull_request.base.ref,
      status: "open", // GitHub state — this PR just opened
      reviewStatus: "pending", // our processing state
    })
    .onConflictDoUpdate({
      target: [pullRequest.repoFullName, pullRequest.prNumber],
      set: {
        title: payload.pull_request.title,
        headSha: payload.pull_request.head.sha,
        reviewStatus: "pending",
        updatedAt: new Date(),
      },
    })
    .returning();

  const featureRequestId = await findFeatureRequestId(
    (payload.pull_request as any).body ?? null,
    (payload.pull_request as any).head.ref,
    workspaceId
  );

  if (featureRequestId) {
    await db
      .update(pullRequest)
      .set({ featureRequestId })
      .where(eq(pullRequest.id, pr.id));

    await db
      .update(featureRequest)
      .set({ status: "in_review" })
      .where(eq(featureRequest.id, featureRequestId));
  }

  return pr;
}
