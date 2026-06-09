import type { OverviewData } from "@/features/overview/types/overview";
import {
  getInstallationStatus,
  getUserInstallationId,
} from "@/features/github/server/installation";
import { getUserSubscription } from "@/features/settings/server/subscription";

import { getRecentReviewActivity, getReviewsThisWeek } from "./activity";
import { getInstallationRepoSummary } from "./repo-summary";

export async function getOverview(userId: string): Promise<OverviewData> {
  const installation = await getInstallationStatus(userId);
  const subscription = await getUserSubscription(userId);
  const reviewsThisWeek = await getReviewsThisWeek(userId);
  const recentActivity = await getRecentReviewActivity(userId);

  if (!installation.connected) {
    return {
      installation,
      repos: null,
      reviewsThisWeek,
      plan: subscription.plan,
      recentActivity,
    };
  }

  const installationId = await getUserInstallationId(userId);

  if (!installationId) {
    return {
      installation,
      repos: null,
      reviewsThisWeek,
      plan: subscription.plan,
      recentActivity,
    };
  }

  const repos = await getInstallationRepoSummary(installationId);

  return {
    installation,
    repos,
    reviewsThisWeek,
    plan: subscription.plan,
    recentActivity,
  };
}
