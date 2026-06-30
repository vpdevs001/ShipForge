/**
 * Feature Request detail hub — Chat / PRD / Tasks tabs.
 *
 * This is the central page for a single feature request. It shows:
 *  - Status badge and metadata in the header
 *  - Tabs: Chat (clarification), PRD (generated document), Tasks (Kanban)
 *
 * Route: /dashboard/requests/[id]
 * Server Component — loads FR data on the server, passes to client tab content.
 */

import { notFound } from "next/navigation";
import Link from "next/link";
import { requireAuth } from "@/features/auth/utils/require-auth";
import { db } from "@/lib/db";
import { featureRequest, prd, task } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { DashboardHeader } from "@/features/dashboard/components/dashboard-header";
import { DASHBOARD_ROUTES } from "@/features/dashboard/lib/routes";
import { statusBadge } from "@/features/dashboard/lib/status-style";
import { ArrowLeftIcon } from "@phosphor-icons/react/ssr";
import { FeatureRequestTabs } from "@/features/feature-requests/components/feature-request-tabs";
import { formatDistanceToNow } from "date-fns";

// ── helpers ──────────────────────────────────────────────────────────────────

function statusTone(
  status: string
): "success" | "info" | "warning" | "danger" | "neutral" {
  if (status === "shipped" || status === "approved") return "success";
  if (["in_review", "prd_ready", "planning", "in_development"].includes(status))
    return "info";
  if (status === "fix_needed") return "warning";
  if (status === "rejected") return "danger";
  return "neutral";
}

// ── page ─────────────────────────────────────────────────────────────────────

export default async function FeatureRequestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAuth();
  const { id } = await params;

  // Load the feature request
  const [fr] = await db
    .select()
    .from(featureRequest)
    .where(eq(featureRequest.id, id))
    .limit(1);

  if (!fr) notFound();

  // Load the latest PRD (if any)
  const [latestPrd] = await db
    .select()
    .from(prd)
    .where(eq(prd.featureRequestId, id))
    .orderBy(desc(prd.createdAt))
    .limit(1);

  // Load tasks
  const tasks = await db
    .select()
    .from(task)
    .where(eq(task.featureRequestId, id))
    .orderBy(task.order);

  return (
    <div className="flex flex-1 flex-col">
      <DashboardHeader
        title={fr.title}
        description={`Feature request · ${fr.id.slice(0, 8)}`}
      />

      <div className="flex flex-1 flex-col gap-4 p-6">
        {/* ── Back + metadata bar ─────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href={DASHBOARD_ROUTES.requests}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeftIcon className="size-4" />
            Feature Requests
          </Link>

          <div className="flex items-center gap-3">
            {/* Status badge */}
            <span className={statusBadge(statusTone(fr.status))}>
              {fr.status.replace(/_/g, " ")}
            </span>
            {/* Created time */}
            <span className="font-mono text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(fr.createdAt), { addSuffix: true })}
            </span>
          </div>
        </div>

        {/* ── Raw input preview ───────────────────────────────────────── */}
        <div className="rounded-lg border border-border bg-card px-5 py-4">
          <p className="mb-1 font-mono text-xs text-muted-foreground uppercase tracking-wider">
            Original request
          </p>
          <p className="text-sm text-foreground leading-relaxed">
            {fr.rawInput}
          </p>
        </div>

        {/* ── Tabs: Chat / PRD / Tasks ────────────────────────────────── */}
        <FeatureRequestTabs
          featureRequestId={fr.id}
          workspaceId={fr.workspaceId}
          status={fr.status}
          prd={latestPrd ?? null}
          tasks={tasks}
        />
      </div>
    </div>
  );
}
