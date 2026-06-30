/**
 * Feature Requests list page — all requests in the workspace, filterable by
 * status. Server Component; data fetched directly from DB server-side.
 *
 * Route: /dashboard/requests
 */

import Link from "next/link";
import { requireAuth } from "@/features/auth/utils/require-auth";
import { getPrimaryWorkspaceId } from "@/lib/db/workspace";
import { db } from "@/lib/db";
import { featureRequest } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { DashboardHeader } from "@/features/dashboard/components/dashboard-header";
import { statusBadge } from "@/features/dashboard/lib/status-style";
import { DASHBOARD_ROUTES } from "@/features/dashboard/lib/routes";
import { PlusIcon, ArrowRightIcon } from "@phosphor-icons/react/ssr";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";

// ── helpers ──────────────────────────────────────────────────────────────────

/** All possible feature request status values from the enum. */
const ALL_STATUSES = [
  "draft",
  "clarifying",
  "prd_generating",
  "prd_ready",
  "planning",
  "in_development",
  "in_review",
  "fix_needed",
  "approved",
  "shipped",
  "rejected",
] as const;

type FeatureRequestStatus = (typeof ALL_STATUSES)[number];

/** Maps each status to a badge tone for color coding. */
function statusTone(
  status: FeatureRequestStatus
): "success" | "info" | "warning" | "danger" | "neutral" {
  if (status === "shipped" || status === "approved") return "success";
  if (["in_review", "prd_ready", "planning", "in_development"].includes(status))
    return "info";
  if (status === "fix_needed") return "warning";
  if (status === "rejected") return "danger";
  return "neutral";
}

// ── page ─────────────────────────────────────────────────────────────────────

export default async function RequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await requireAuth();
  const params = await searchParams;
  const activeFilter =
    (params.status as FeatureRequestStatus | undefined) ?? "all";

  const workspaceId = await getPrimaryWorkspaceId(session.user.id);

  const allRequests = workspaceId
    ? await db
        .select()
        .from(featureRequest)
        .where(eq(featureRequest.workspaceId, workspaceId))
        .orderBy(desc(featureRequest.createdAt))
    : [];

  // Client-side filter by status
  const filtered =
    activeFilter === "all"
      ? allRequests
      : allRequests.filter((fr) => fr.status === activeFilter);

  // Count per status for the filter tabs
  const counts = allRequests.reduce<Record<string, number>>((acc, fr) => {
    acc[fr.status] = (acc[fr.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="flex flex-1 flex-col">
      <DashboardHeader
        title="Feature Requests"
        description="Manage and track all feature ideas through the AI pipeline"
      />

      <div className="flex flex-1 flex-col gap-4 p-6">
        {/* ── Toolbar ────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Status filter pills */}
          <div className="flex flex-wrap gap-2">
            <Link
              href={DASHBOARD_ROUTES.requests}
              className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                activeFilter === "all"
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
              }`}
            >
              All
              <span className="font-mono">{allRequests.length}</span>
            </Link>
            {ALL_STATUSES.filter((s) => counts[s]).map((status) => (
              <Link
                key={status}
                href={`${DASHBOARD_ROUTES.requests}?status=${status}`}
                className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                  activeFilter === status
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
                }`}
              >
                {status.replace(/_/g, " ")}
                <span className="font-mono">{counts[status]}</span>
              </Link>
            ))}
          </div>

          {/* New request button */}
          <Button
            size="sm"
            render={
              <Link href={`${DASHBOARD_ROUTES.requests}/new`}>
                <PlusIcon className="mr-1.5 size-4" weight="bold" />
                New Request
              </Link>
            }
          />
        </div>

        {/* ── List ───────────────────────────────────────────────────── */}
        {filtered.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-border py-20 text-center">
            <p className="text-sm text-muted-foreground">
              {activeFilter === "all"
                ? "No feature requests yet."
                : `No requests with status "${activeFilter.replace(/_/g, " ")}".`}
            </p>
            <Button
              size="sm"
              variant="outline"
              render={
                <Link href={`${DASHBOARD_ROUTES.requests}/new`}>
                  <PlusIcon className="mr-1.5 size-4" weight="bold" />
                  Create your first request
                </Link>
              }
            />
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-card">
            <ul className="divide-y divide-border">
              {filtered.map((fr) => (
                <li key={fr.id}>
                  <Link
                    href={`${DASHBOARD_ROUTES.requests}/${fr.id}`}
                    className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-muted/30"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3">
                        <p className="truncate font-medium text-foreground">
                          {fr.title}
                        </p>
                        <span className={statusBadge(statusTone(fr.status as FeatureRequestStatus))}>
                          {fr.status.replace(/_/g, " ")}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-3">
                        <span className="font-mono text-xs text-muted-foreground">
                          {fr.id.slice(0, 8)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(fr.createdAt), {
                            addSuffix: true,
                          })}
                        </span>
                        {fr.source && (
                          <span className="font-mono text-xs text-muted-foreground">
                            via {fr.source}
                          </span>
                        )}
                      </div>
                    </div>
                    <ArrowRightIcon className="size-4 shrink-0 text-muted-foreground" />
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
