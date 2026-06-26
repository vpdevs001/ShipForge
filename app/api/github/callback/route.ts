import { DASHBOARD_ROUTES } from "@/features/dashboard/lib/routes";
import { saveInstallation } from "@/features/github/server/installation";
import { getServerSession } from "@/features/auth/actions";
import { getPrimaryWorkspaceId } from "@/lib/db/workspace";
import { redirect } from "next/navigation";

function buildSignInCallbackUrl(installationId: string | null): string {
  if (installationId) {
    return `/api/github/callback?installation_id=${installationId}`;
  }

  return DASHBOARD_ROUTES.github;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const installationId = searchParams.get("installation_id");

  const session = await getServerSession();

  if (!session) {
    const callbackUrl = buildSignInCallbackUrl(installationId);
    redirect(`/sign-in?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  if (installationId) {
    const workspaceId = await getPrimaryWorkspaceId(session.user.id);
    if (workspaceId) {
      await saveInstallation(
        session.user.id,
        parseInt(installationId, 10),
        workspaceId
      );
    }
  }

  redirect(DASHBOARD_ROUTES.github);
}
