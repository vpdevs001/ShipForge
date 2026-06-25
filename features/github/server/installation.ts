import type { GithubInstallationStatus } from "@/features/dashboard/lib/types";
import { getGithubApp } from "@/features/github/utils/github-app";
import { db } from "@/lib/db";
import { githubInstallation } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

function getAccountLogin(
  account: { login?: string; slug?: string } | null | undefined
): string | null {
  if (!account) {
    return null;
  }

  if ("login" in account && account.login) {
    return account.login;
  }

  if (account.slug) {
    return account.slug;
  }

  return null;
}
function buildDisconnectedStatus(): GithubInstallationStatus {
  return { connected: false, accountLogin: null, installedAt: null };
}

export async function getInstallationStatus(userId: string) {
  const [installation] = await db
    .select()
    .from(githubInstallation)
    .where(eq(githubInstallation.userId, userId))
    .limit(1);

  if (!installation) {
    return buildDisconnectedStatus();
  }

  return {
    connected: true,
    accountLogin: installation.accountLogin,
    installedAt: installation.createdAt.toISOString(),
  };
}

export async function saveInstallation(userId: string, installationId: number) {
  const app = getGithubApp();

  const { data } = await app.octokit.request(
    "GET /app/installations/{installation_id}",
    { installation_id: installationId }
  );

  const accountLogin = getAccountLogin(data.account);

  await db
    .insert(githubInstallation)
    .values({
      id: crypto.randomUUID(),
      userId,
      installationId,
      accountLogin,
      accountType: data.target_type ?? null,
    })
    .onConflictDoUpdate({
      target: githubInstallation.userId,
      set: {
        installationId,
        accountLogin,
        accountType: data.target_type ?? null,
      },
    });
}

export async function deleteInstallation(userId: string) {
  await db
    .delete(githubInstallation)
    .where(eq(githubInstallation.userId, userId));
}

export async function getUserIdByInstallationId(installationId: number) {
  const [installation] = await db
    .select({ userId: githubInstallation.userId })
    .from(githubInstallation)
    .where(eq(githubInstallation.installationId, installationId))
    .limit(1);

  if (!installation) {
    return null;
  }

  return installation.userId;
}

export async function getUserInstallationId(userId: string) {
  const [installation] = await db
    .select({ installationId: githubInstallation.installationId })
    .from(githubInstallation)
    .where(eq(githubInstallation.userId, userId))
    .limit(1);

  if (!installation) {
    return null;
  }

  return installation.installationId;
}
