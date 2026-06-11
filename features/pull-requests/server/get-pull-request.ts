import { prisma } from "@/lib/db";

export async function getPullRequestById(
  installationId: number,
  pullRequestId: string
) {
  const pullRequest = await prisma.pullRequest.findUnique({
    where: { id: pullRequestId },
  });

  // Only show pull requests that belong to this user's installation
  if (!pullRequest || pullRequest.installationId !== installationId) {
    return null;
  }

  return pullRequest;
}
