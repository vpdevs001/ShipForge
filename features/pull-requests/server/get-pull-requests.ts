import type {
  PullRequestItem,
  PullRequestStatus,
  RepoPullRequests,
} from "@/features/pull-requests/types/pull-request";
import { prisma } from "@/lib/db";

type PullRequestRecord = {
  id: string;
  repoFullName: string;
  prNumber: number;
  title: string;
  authorLogin: string | null;
  baseBranch: string;
  status: string;
  reviewComment: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
};

function toPullRequestItem(record: PullRequestRecord): PullRequestItem {
  return {
    id: record.id,
    prNumber: record.prNumber,
    title: record.title,
    authorLogin: record.authorLogin,
    baseBranch: record.baseBranch,
    status: record.status as PullRequestStatus,
    reviewComment: record.reviewComment,
    reviewedAt: record.reviewedAt?.toISOString() ?? null,
    createdAt: record.createdAt.toISOString(),
  };
}

export async function getPullRequestsByRepo(
  installationId: number
): Promise<RepoPullRequests[]> {
  const records = await prisma.pullRequest.findMany({
    where: { installationId },
    orderBy: { updatedAt: "desc" },
  });

  const groups: RepoPullRequests[] = [];

  for (const record of records) {
    let group = groups.find((g) => g.repoFullName === record.repoFullName);

    if (!group) {
      group = { repoFullName: record.repoFullName, pullRequests: [] };
      groups.push(group);
    }

    group.pullRequests.push(toPullRequestItem(record));
  }

  return groups;
}
