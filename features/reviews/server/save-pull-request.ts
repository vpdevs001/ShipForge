import { PullRequestWebhookPayload } from "@/features/github/server/webhook-handler";
import { db } from "@/lib/db";
import { pullRequest } from "@/lib/db/schema";

function getAuthorLogin(user: { login: string } | null): string | null {
  if (!user) {
    return null;
  }
  return user.login;
}

export async function savePullRequest(payload: PullRequestWebhookPayload) {
  const repoFullName = payload.repository.full_name;
  const prNumber = payload.pull_request.number;

  const [pr] = await db
    .insert(pullRequest)
    .values({
      id: crypto.randomUUID(),
      installationId: payload.installation.id,
      repoFullName,
      prNumber,
      title: payload.pull_request.title,
      authorLogin: getAuthorLogin(payload.pull_request.user),
      headSha: payload.pull_request.head.sha,
      baseBranch: payload.pull_request.base.ref,
      status: "pending",
    })
    .onConflictDoUpdate({
      target: [pullRequest.repoFullName, pullRequest.prNumber],
      set: {
        title: payload.pull_request.title,
        headSha: payload.pull_request.head.sha,
        status: "pending",
      },
    })
    .returning();

  return pr;
}
