/**
 * New Feature Request page.
 *
 * Server Component — resolves the user's workspace and its projects on
 * the server (so the client form never needs IDs typed in by hand), then
 * renders the client form for title/description/project selection.
 *
 * Route: /dashboard/requests/new
 */

import Link from "next/link";
import { requireAuth } from "@/features/auth/utils/require-auth";
import { getPrimaryWorkspaceId } from "@/lib/db/workspace";
import { db } from "@/lib/db";
import { project } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { DashboardHeader } from "@/features/dashboard/components/dashboard-header";
import { DASHBOARD_ROUTES } from "@/features/dashboard/lib/routes";
import { NewFeatureRequestForm } from "@/features/feature-requests/components/new-feature-request-form";
import { ArrowLeftIcon } from "@phosphor-icons/react/ssr";

export default async function NewRequestPage() {
  const session = await requireAuth();
  const workspaceId = await getPrimaryWorkspaceId(session.user.id);

  const projects = workspaceId
    ? await db
        .select({ id: project.id, name: project.name })
        .from(project)
        .where(eq(project.workspaceId, workspaceId))
    : [];

  return (
    <div className="flex flex-1 flex-col">
      <DashboardHeader
        title="New Feature Request"
        description="Describe your feature idea — the AI pipeline will take it from here"
      />

      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6">
        {/* Back link */}
        <Link
          href={DASHBOARD_ROUTES.requests}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeftIcon className="size-4" />
          Back to Feature Requests
        </Link>

        {workspaceId ? (
          <NewFeatureRequestForm workspaceId={workspaceId} projects={projects} />
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border py-16 text-center">
            <p className="text-sm text-muted-foreground">
              You&apos;re not part of a workspace yet. Connect a GitHub repo
              to create one automatically.
            </p>
            <Link
              href={DASHBOARD_ROUTES.github}
              className="text-sm text-primary hover:underline"
            >
              Go to GitHub App settings
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
