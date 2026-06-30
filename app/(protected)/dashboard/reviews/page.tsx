/**
 * Pull Requests / Reviews list page.
 *
 * Lists all pull requests across the workspace with their AI review status
 * and verdict. Filterable by review status. Links to individual review pages.
 *
 * Route: /dashboard/reviews
 * Server Component — data loaded directly from DB.
 */

import Link from "next/link";
import { requireAuth } from "@/features/auth/utils/require-auth";
import { getPrimaryWorkspaceId } from "@/lib/db/workspace";
import { db } from "@/lib/db";
import { pullRequest } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { DashboardHeader } from "@/features/dashboard/components/dashboard-header";
import {
  statusBadge,
  statusTextClass,
} from "@/features/dashboard/lib/status-style";
import { DASHBOARD_ROUTES } from "@/features/dashboard/lib/routes";
import { GitBranchIcon, ArrowRightIcon } from "@phosphor-icons/react/ssr";
import { formatDistanceToNow } from "date-fns";

// ── helpers ──────────────────────────────────────────────────────────────────

/** Maps a PR review status to a badge tone. */
function reviewStatusTone(
  status: string | null
): "success" | "warning" | "danger" | "neutral" {
  if (status === "reviewed") return "success";
  if (status === "processing" || status === "rate_limited") return "warning";
  if (status === "failed") return "danger";
  return "neutral";
}

/** Maps a PR merge status to a badge tone. */
function prStatusTone(status: string): "success" | "info" | "neutral" {
  if (status === "merged") return "success";
  if (status === "open") return "info";
  return "neutral";
}

// ── page ─────────────────────────────────────────────────────────────────────

export default async function ReviewsPage() {
  const session = await requireAuth();
  const workspaceId = await getPrimaryWorkspaceId(session.user.id);

  const pullRequests = workspaceId
    ? await db
        .select()
        .from(pullRequest)
        .where(eq(pullRequest.workspaceId, workspaceId))
        .orderBy(desc(pullRequest.createdAt))
    : [];

  return (
    <div className="flex flex-1 flex-col">
      <DashboardHeader
        title="Pull Requests"
        description="AI-reviewed pull requests across all workspace projects"
      />

      <div className="flex flex-1 flex-col gap-4 p-6">
        {/* Stats row */}
        {pullRequests.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              {
                label: "Total PRs",
                value: pullRequests.length,
                tone: "neutral",
              },
              {
                label: "Reviewed",
                value: pullRequests.filter(
                  (pr) => pr.reviewStatus === "reviewed"
                ).length,
                tone: "success",
              },
              {
                label: "Pending",
                value: pullRequests.filter(
                  (pr) => pr.reviewStatus === "pending"
                ).length,
                tone: "info",
              },
              {
                label: "Failed",
                value: pullRequests.filter((pr) => pr.reviewStatus === "failed")
                  .length,
                tone: "danger",
              },
            ].map(({ label, value, tone }) => (
              <div
                key={label}
                className="flex flex-col gap-1 rounded-lg border border-border bg-card px-4 py-3"
              >
                <span className="font-mono text-xs text-muted-foreground uppercase tracking-wider">
                  {label}
                </span>
                <span
                  className={`font-heading text-2xl font-bold ${statusTextClass[tone as keyof typeof statusTextClass]}`}
                >
                  {value}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* PR list */}
        {pullRequests.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-border py-20 text-center">
            <GitBranchIcon className="size-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No pull requests yet. Open a PR on a synced repository to trigger
              an AI review.
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-card">
            <ul className="divide-y divide-border">
              {pullRequests.map((pr) => (
                <li key={pr.id}>
                  <Link
                    href={`${DASHBOARD_ROUTES.reviews}/${pr.id}`}
                    className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-muted/30"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-4">
                      {/* PR number + title */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-muted-foreground">
                            #{pr.prNumber}
                          </span>
                          <p className="truncate text-sm font-medium text-foreground">
                            {pr.title ?? `PR #${pr.prNumber}`}
                          </p>
                        </div>
                        <div className="mt-0.5 flex items-center gap-2">
                          <span className="font-mono text-xs text-muted-foreground">
                            {pr.repoFullName}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(pr.createdAt), {
                              addSuffix: true,
                            })}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* PR status (open/closed/merged) */}
                      <span className={statusBadge(prStatusTone(pr.status))}>
                        {pr.status}
                      </span>
                      {/* Review status */}
                      <span
                        className={statusBadge(
                          reviewStatusTone(pr.reviewStatus ?? null)
                        )}
                      >
                        {pr.reviewStatus?.replace(/_/g, " ") ?? "pending"}
                      </span>
                      <ArrowRightIcon className="size-4 text-muted-foreground" />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
