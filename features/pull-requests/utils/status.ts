import type { PullRequestStatus } from "@/features/pull-requests/types/pull-request";

export const PR_STATUS_LABELS: Record<PullRequestStatus, string> = {
  pending: "Pending",
  processing: "Reviewing…",
  reviewed: "Reviewed",
};

export function getPrStatusTone(
  status: PullRequestStatus
): "neutral" | "info" | "success" {
  if (status === "reviewed") {
    return "success";
  }

  if (status === "processing") {
    return "info";
  }

  return "neutral";
}
