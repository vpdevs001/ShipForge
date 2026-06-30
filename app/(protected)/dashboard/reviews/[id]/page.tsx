/**
 * Single Pull Request / Review detail page.
 *
 * Shows:
 *  - PR metadata (number, title, repo, branch)
 *  - AI review verdict (pass / fail / needs_changes)
 *  - Review issues grouped by severity (blocking first)
 *  - Human approval / rejection action
 *  - Link to associated feature request (if any)
 *
 * Route: /dashboard/reviews/[id]
 * Server Component — data loaded from DB; approval action is client-side.
 */

import { notFound } from "next/navigation";
import Link from "next/link";
import { requireAuth } from "@/features/auth/utils/require-auth";
import { db } from "@/lib/db";
import {
  pullRequest,
  review,
  reviewIssue,
  approval,
  featureRequest,
} from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { DashboardHeader } from "@/features/dashboard/components/dashboard-header";
import { DASHBOARD_ROUTES } from "@/features/dashboard/lib/routes";
import { statusBadge } from "@/features/dashboard/lib/status-style";
import { ArrowLeftIcon, ShieldCheckIcon, GitBranchIcon, WarningCircleIcon, CheckCircleIcon } from "@phosphor-icons/react/ssr";
import { ApprovalPanel } from "@/features/reviews/components/approval-panel";
import { formatDistanceToNow } from "date-fns";

// ── helpers ──────────────────────────────────────────────────────────────────

function verdictTone(
  verdict: string | null
): "success" | "warning" | "danger" | "neutral" {
  if (verdict === "pass") return "success";
  if (verdict === "needs_changes") return "warning";
  if (verdict === "fail") return "danger";
  return "neutral";
}

function severityTone(severity: string): "danger" | "warning" {
  return severity === "blocking" ? "danger" : "warning";
}

function categoryLabel(category: string): string {
  return category.replace(/_/g, " ");
}

// ── page ─────────────────────────────────────────────────────────────────────

export default async function ReviewDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAuth();
  const { id } = await params;

  // Load PR
  const [pr] = await db
    .select()
    .from(pullRequest)
    .where(eq(pullRequest.id, id))
    .limit(1);

  if (!pr) notFound();

  // Load latest review
  const [latestReview] = await db
    .select()
    .from(review)
    .where(eq(review.pullRequestId, pr.id))
    .orderBy(desc(review.createdAt))
    .limit(1);

  // Load review issues (if review exists)
  const issues = latestReview
    ? await db
        .select()
        .from(reviewIssue)
        .where(eq(reviewIssue.reviewId, latestReview.id))
    : [];

  // Load existing approval
  const [existingApproval] = latestReview
    ? await db
        .select()
        .from(approval)
        .where(eq(approval.reviewId, latestReview.id))
        .limit(1)
    : [undefined];

  // Load associated feature request (optional)
  const [associatedFr] = pr.featureRequestId
    ? await db
        .select({ id: featureRequest.id, title: featureRequest.title })
        .from(featureRequest)
        .where(eq(featureRequest.id, pr.featureRequestId))
        .limit(1)
    : [undefined];

  // Split issues by severity
  const blockingIssues = issues.filter((i) => i.severity === "blocking");
  const nonBlockingIssues = issues.filter((i) => i.severity === "non_blocking");

  return (
    <div className="flex flex-1 flex-col">
      <DashboardHeader
        title={pr.title ?? `PR #${pr.prNumber}`}
        description={`${pr.repoFullName} · PR #${pr.prNumber}`}
      />

      <div className="flex flex-1 flex-col gap-5 p-6">
        {/* Back link */}
        <Link
          href={DASHBOARD_ROUTES.reviews}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeftIcon className="size-4" />
          Pull Requests
        </Link>

        {/* ── PR metadata card ──────────────────────────────────────── */}
        <div className="rounded-lg border border-border bg-card">
          <div className="flex flex-wrap items-start justify-between gap-4 p-5">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <GitBranchIcon className="size-4 text-muted-foreground" />
                <span className="font-heading font-semibold text-foreground">
                  {pr.title ?? `PR #${pr.prNumber}`}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="font-mono">{pr.repoFullName}</span>
                <span className="font-mono">#{pr.prNumber}</span>
                <span>
                  {formatDistanceToNow(new Date(pr.createdAt), {
                    addSuffix: true,
                  })}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className={statusBadge(verdictTone(pr.reviewStatus ?? null))}>
                {pr.reviewStatus?.replace(/_/g, " ") ?? "pending"}
              </span>
              {latestReview?.verdict && (
                <span
                  className={statusBadge(verdictTone(latestReview.verdict))}
                >
                  {latestReview.verdict.replace(/_/g, " ")}
                </span>
              )}
            </div>
          </div>

          {/* Associated feature request link */}
          {associatedFr && (
            <div className="border-t border-border px-5 py-3">
              <span className="text-xs text-muted-foreground">
                Associated request:{" "}
                <Link
                  href={`${DASHBOARD_ROUTES.requests}/${associatedFr.id}`}
                  className="text-primary hover:underline"
                >
                  {associatedFr.title}
                </Link>
              </span>
            </div>
          )}
        </div>

        {/* ── Review summary ────────────────────────────────────────── */}
        {latestReview ? (
          <div className="flex flex-col gap-4">
            {/* Verdict banner */}
            {latestReview.verdict && (
              <div
                className={`flex items-center gap-3 rounded-lg border p-4 ${
                  latestReview.verdict === "pass"
                    ? "border-green-500/30 bg-green-500/5"
                    : latestReview.verdict === "needs_changes"
                    ? "border-amber-500/30 bg-amber-500/5"
                    : "border-red-500/30 bg-red-500/5"
                }`}
              >
                {latestReview.verdict === "pass" ? (
                  <CheckCircleIcon className="size-5 text-green-500" />
                ) : (
                  <WarningCircleIcon
                    className={`size-5 ${
                      latestReview.verdict === "needs_changes"
                        ? "text-amber-500"
                        : "text-red-500"
                    }`}
                  />
                )}
                <div>
                  <p className="font-heading font-semibold text-foreground">
                    {latestReview.verdict === "pass"
                      ? "AI Review Passed"
                      : latestReview.verdict === "needs_changes"
                      ? "Changes Requested"
                      : "AI Review Failed"}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {issues.length === 0
                      ? "No issues found."
                      : `${blockingIssues.length} blocking, ${
                          issues.length - blockingIssues.length
                        } non-blocking issue${
                          issues.length === 1 ? "" : "s"
                        } found.`}
                  </p>
                </div>
              </div>
            )}

            {/* Issues */}
            {issues.length > 0 ? (
              <div className="flex flex-col gap-3">
                {/* Blocking */}
                {blockingIssues.length > 0 && (
                  <IssueGroup
                    title={`Blocking Issues (${blockingIssues.length})`}
                    issues={blockingIssues}
                    borderClass="border-red-500/20"
                    bgClass="bg-red-500/5"
                    labelClass="text-red-500"
                  />
                )}

                {/* Non-blocking */}
                {nonBlockingIssues.length > 0 && (
                  <IssueGroup
                    title={`Non-Blocking Issues (${nonBlockingIssues.length})`}
                    issues={nonBlockingIssues}
                    borderClass="border-amber-500/20"
                    bgClass="bg-amber-500/5"
                    labelClass="text-amber-500"
                  />
                )}
              </div>
            ) : (
              <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-4 text-sm text-green-700 dark:text-green-400">
                No issues found. The AI review found nothing to flag.
              </div>
            )}

            {/* ── Human approval panel (client component) ────────────── */}
            {latestReview && (
              <ApprovalPanel
                reviewId={latestReview.id}
                existingApproval={existingApproval ?? null}
              />
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border py-16 text-center">
            <ShieldCheckIcon className="size-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No AI review run yet for this pull request.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sub-component: issue group ───────────────────────────────────────────────

type ReviewIssueRow = {
  id: string;
  title: string | null;
  description: string | null;
  filePath: string | null;
  lineNumber: number | null;
  category: string;
  severity: string;
  suggestion: string | null;
  status: string;
};

function IssueGroup({
  title,
  issues,
  borderClass,
  bgClass,
  labelClass,
}: {
  title: string;
  issues: ReviewIssueRow[];
  borderClass: string;
  bgClass: string;
  labelClass: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      <div className="flex flex-col gap-2">
        {issues.map((issue) => (
          <div
            key={issue.id}
            className={`rounded-lg border p-4 ${borderClass} ${bgClass}`}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <span className={`text-sm font-semibold ${labelClass}`}>
                {issue.title ?? categoryLabel(issue.category)}
              </span>
              <span className={statusBadge(severityTone(issue.severity))}>
                {issue.severity.replace(/_/g, " ")}
              </span>
            </div>
            {issue.description && (
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                {issue.description}
              </p>
            )}
            {issue.filePath && (
              <p className="mt-2 font-mono text-[11px] text-muted-foreground">
                {issue.filePath}
                {issue.lineNumber ? `#L${issue.lineNumber}` : ""}
              </p>
            )}
            {issue.suggestion && (
              <p className="mt-2 text-xs text-foreground">
                <strong>Suggestion:</strong> {issue.suggestion}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
