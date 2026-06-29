"use server";

import { getServerSession } from "@/features/auth/utils/get-server-session";
import { DASHBOARD_ROUTES } from "@/features/dashboard/lib/routes";
import { getUserInstallationId } from "@/features/github/server/installation";
import { getPrimaryWorkspaceId } from "@/lib/db/workspace";
import { redirect } from "next/navigation";
import { triggerRepoSync } from "../server/repo-sync";

export async function syncRepoCodebase(repoFullName: string, branch: string) {
  const session = await getServerSession();

  if (!session) {
    redirect("/sign-in");
  }

  const installationId = await getUserInstallationId(session.user.id);

  if (!installationId) {
    redirect(DASHBOARD_ROUTES.github);
  }

  const workspaceId = await getPrimaryWorkspaceId(session.user.id);

  if (!workspaceId) {
    redirect(DASHBOARD_ROUTES.github);
  }

  await triggerRepoSync(installationId, repoFullName, branch, workspaceId);
}
