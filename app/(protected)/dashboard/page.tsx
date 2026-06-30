/**
 * Dashboard overview page — workspace at a glance.
 *
 * Shows:
 *  - Status distribution of feature requests in the workspace
 *  - Recent pull request reviews with their verdict
 *  - Quick-action cards to start a new feature request or view reviews
 *
 * This is a Server Component. Data is loaded server-side via direct DB
 * calls rather than tRPC so the page renders without a client-side
 * loading waterfall.
 */

import Link from "next/link";
import { requireAuth } from "@/features/auth/utils/require-auth";
import { getPrimaryWorkspaceId } from "@/lib/db/workspace";
import { db } from "@/lib/db";
import { featureRequest, pullRequest, review } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { DashboardHeader } from "@/features/dashboard/components/dashboard-header";
import { statusBadge } from "@/features/dashboard/lib/status-style";
import {
  Chats,
  GitBranch,
  CheckSquare,
  ArrowRight,
  ShieldCheck,
  Rocket,
  Plus,
} from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { DASHBOARD_ROUTES } from "@/features/dashboard/lib/routes";

// ── helpers ──────────────────────────────────────────────────────────────────

/** Maps each feature-request status to a semantic badge tone. */
function statusTone(
  status: string
): "success" | "info" | "warning" | "danger" | "neutral" {
  if (status === "shipped" || status === "approved") return "success";
  if (status === "in_review" || status === "prd_ready" || status === "planning")
    return "info";
  if (status === "fix_needed") return "warning";
  if (status === "rejected") return "danger";
  return "neutral";
}

/** Maps a review verdict to a badge tone. */
function verdictTone(
  verdict: string | null
): "success" | "warning" | "danger" | "neutral" {
  if (verdict === "pass") return "success";
  if (verdict === "needs_changes") return "warning";
  if (verdict === "fail") return "danger";
  return "neutral";
}

/** Returns a human-readable label for a feature-request status value. */
function statusLabel(status: string): string {
  return status.replace(/_/g, " ");
}

// ── page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const session = await requireAuth();
  const workspaceId = await getPrimaryWorkspaceId(session.user.id);

  // Fetch feature requests and reviews in parallel when a workspace exists
  const [featureRequests, pullRequests] = await Promise.all([
    workspaceId
      ? db
          .select()
          .from(featureRequest)
          .where(eq(featureRequest.workspaceId, workspaceId))
          .orderBy(desc(featureRequest.createdAt))
          .limit(50)
      : [],
    workspaceId
      ? db
          .select({
            id: pullRequest.id,
            title: pullRequest.title,
            prNumber: pullRequest.prNumber,
            status: pullRequest.status,
            reviewStatus: pullRequest.reviewStatus,
            createdAt: pullRequest.createdAt,
          })
          .from(pullRequest)
          .where(eq(pullRequest.workspaceId, workspaceId))
          .orderBy(desc(pullRequest.createdAt))
          .limit(8)
      : [],
  ]);

  // ── derived statistics ──────────────────────────────────────────────────────

  /** Count feature requests per status for the status strip. */
  const statusCounts = featureRequests.reduce<Record<string, number>>(
    (acc, fr) => {
      acc[fr.status] = (acc[fr.status] ?? 0) + 1;
      return acc;
    },
    {}
  );

  const activeCount = featureRequests.filter(
    (fr) => !["shipped", "rejected"].includes(fr.status)
  ).length;

  // Most recent 6 feature requests for the activity list
  const recentRequests = featureRequests.slice(0, 6);

  // ── render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-1 flex-col">
      <DashboardHeader
        title="Overview"
        description="Your workspace at a glance"
      />

      <div className="flex flex-1 flex-col gap-6 p-6">
        {/* ── Quick-action cards ──────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* New Feature Request */}
          <Link
            href={DASHBOARD_ROUTES.requests + "/new"}
            className="group flex flex-col gap-3 rounded-lg border border-border bg-card p-5 transition-all hover:border-primary/50 hover:shadow-[0_0_16px_rgba(0,0,0,0.08)]"
          >
            <div className="flex size-10 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
              <Plus className="size-5" weight="bold" />
            </div>
            <div>
              <p className="font-heading font-semibold text-foreground">
                New Request
              </p>
              <p className="text-xs text-muted-foreground">
                Submit a raw feature idea to kick off the AI pipeline
              </p>
            </div>
          </Link>

          {/* Feature Requests */}
          <Link
            href={DASHBOARD_ROUTES.requests}
            className="group flex flex-col gap-3 rounded-lg border border-border bg-card p-5 transition-all hover:border-primary/50 hover:shadow-[0_0_16px_rgba(0,0,0,0.08)]"
          >
            <div className="flex size-10 items-center justify-center rounded-lg border border-border bg-muted/40 text-muted-foreground transition-colors group-hover:text-primary">
              <Chats className="size-5" />
            </div>
            <div>
              <p className="font-heading font-semibold text-foreground">
                Feature Requests
                {activeCount > 0 && (
                  <span className="ml-2 font-mono text-sm text-primary">
                    {activeCount} active
                  </span>
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                Track all ideas through the clarification → PRD → tasks pipeline
              </p>
            </div>
          </Link>

          {/* Reviews */}
          <Link
            href={DASHBOARD_ROUTES.reviews}
            className="group flex flex-col gap-3 rounded-lg border border-border bg-card p-5 transition-all hover:border-primary/50 hover:shadow-[0_0_16px_rgba(0,0,0,0.08)]"
          >
            <div className="flex size-10 items-center justify-center rounded-lg border border-border bg-muted/40 text-muted-foreground transition-colors group-hover:text-primary">
              <GitBranch className="size-5" />
            </div>
            <div>
              <p className="font-heading font-semibold text-foreground">
                Pull Requests
                {pullRequests.length > 0 && (
                  <span className="ml-2 font-mono text-sm text-primary">
                    {pullRequests.length} recent
                  </span>
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                AI-reviewed pull requests across all projects
              </p>
            </div>
          </Link>
        </div>

        {/* ── Status distribution ─────────────────────────────────────── */}
        {Object.keys(statusCounts).length > 0 && (
          <div className="rounded-lg border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <h2 className="font-heading text-sm font-semibold">
                Feature Request Pipeline
              </h2>
              <span className="font-mono text-xs text-muted-foreground">
                {featureRequests.length} total
              </span>
            </div>
            <div className="flex flex-wrap gap-3 p-5">
              {Object.entries(statusCounts).map(([status, count]) => (
                <div
                  key={status}
                  className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2"
                >
                  <span className={statusBadge(statusTone(status))}>
                    {statusLabel(status)}
                  </span>
                  <span className="font-mono text-sm font-semibold text-foreground">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* ── Recent feature requests ──────────────────────────────── */}
          <div className="rounded-lg border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <h2 className="font-heading text-sm font-semibold">
                Recent Feature Requests
              </h2>
              <Link
                href={DASHBOARD_ROUTES.requests}
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                View all <ArrowRight className="size-3" />
              </Link>
            </div>

            {recentRequests.length === 0 ? (
              /* Empty state */
              <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <CheckSquare className="size-6" />
                </div>
                <p className="text-sm text-muted-foreground">
                  No feature requests yet.{" "}
                  <Link
                    href={DASHBOARD_ROUTES.requests + "/new"}
                    className="text-primary hover:underline"
                  >
                    Create one
                  </Link>{" "}
                  to start the pipeline.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {recentRequests.map((fr) => (
                  <li key={fr.id}>
                    <Link
                      href={`${DASHBOARD_ROUTES.requests}/${fr.id}`}
                      className="flex items-center justify-between gap-4 px-5 py-3 transition-colors hover:bg-muted/30"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                          {fr.title}
                        </p>
                        <p className="font-mono text-xs text-muted-foreground">
                          {fr.id.slice(0, 8)}
                        </p>
                      </div>
                      <span className={statusBadge(statusTone(fr.status))}>
                        {statusLabel(fr.status)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* ── Recent pull requests ─────────────────────────────────── */}
          <div className="rounded-lg border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <h2 className="font-heading text-sm font-semibold">
                Recent Pull Requests
              </h2>
              <Link
                href={DASHBOARD_ROUTES.reviews}
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                View all <ArrowRight className="size-3" />
              </Link>
            </div>

            {pullRequests.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <GitBranch className="size-6" />
                </div>
                <p className="text-sm text-muted-foreground">
                  No pull requests yet. Submit your first PR to trigger an AI
                  review.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {pullRequests.map((pr) => (
                  <li key={pr.id}>
                    <Link
                      href={`${DASHBOARD_ROUTES.reviews}/${pr.id}`}
                      className="flex items-center justify-between gap-4 px-5 py-3 transition-colors hover:bg-muted/30"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                          {pr.title ?? `PR #${pr.prNumber}`}
                        </p>
                        <p className="font-mono text-xs text-muted-foreground">
                          #{pr.prNumber}
                        </p>
                      </div>
                      <span
                        className={statusBadge(
                          verdictTone(pr.reviewStatus ?? null)
                        )}
                      >
                        {pr.reviewStatus?.replace(/_/g, " ") ?? "pending"}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* ── Pipeline stages reference ────────────────────────────────── */}
        <div className="rounded-lg border border-border bg-card">
          <div className="border-b border-border px-5 py-3">
            <h2 className="font-heading text-sm font-semibold">
              Pipeline Stages
            </h2>
            <p className="text-xs text-muted-foreground">
              Every feature request flows through these six stages
            </p>
          </div>
          <div className="grid grid-cols-2 gap-px bg-border md:grid-cols-3 lg:grid-cols-6">
            {[
              {
                n: "01",
                name: "Intake",
                desc: "Submit raw idea",
                Icon: Chats,
              },
              {
                n: "02",
                name: "Clarify",
                desc: "AI chat Q&A",
                Icon: Chats,
              },
              {
                n: "03",
                name: "PRD",
                desc: "Structured doc",
                Icon: CheckSquare,
              },
              {
                n: "04",
                name: "Tasks",
                desc: "Kanban backlog",
                Icon: CheckSquare,
              },
              {
                n: "05",
                name: "Review",
                desc: "AI PR audit",
                Icon: ShieldCheck,
              },
              {
                n: "06",
                name: "Ship",
                desc: "Merge & deploy",
                Icon: Rocket,
              },
            ].map(({ n, name, desc, Icon }) => (
              <div key={n} className="flex flex-col gap-2 bg-card px-4 py-4">
                <span className="font-mono text-xs text-muted-foreground">
                  {n}
                </span>
                <Icon className="size-5 text-primary" />
                <div>
                  <p className="text-xs font-semibold text-foreground">
                    {name}
                  </p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
