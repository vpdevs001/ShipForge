import { startOfMonth } from "date-fns";

import { getUserInstallationId } from "@/features/github/server/installation";
import { getUserSubscription } from "@/features/billing/server/subscription";
import { db } from "@/lib/db";
import { pullRequest } from "@/lib/db/schema";
import { count, eq, and, gte } from "drizzle-orm";

export const FREE_MONTHLY_LIMIT = 5;

export type UsageSummary = {
  used: number;
  limit: number | null;
};

export async function getReviewsThisMonth(userId: string): Promise<number> {
  const installationId = await getUserInstallationId(userId);

  if (!installationId) {
    return 0;
  }

  const [result] = await db
    .select({ count: count() })
    .from(pullRequest)
    .where(
      and(
        eq(pullRequest.installationId, installationId),
        eq(pullRequest.reviewStatus, "reviewed"),
        gte(pullRequest.updatedAt, startOfMonth(new Date()))
      )
    );

  return result.count;
}

export async function canUserReview(userId: string): Promise<boolean> {
  const subscription = await getUserSubscription(userId);

  if (subscription.plan === "pro" && subscription.status === "active") {
    return true;
  }

  const used = await getReviewsThisMonth(userId);
  return used < FREE_MONTHLY_LIMIT;
}

export async function getUsageSummary(userId: string): Promise<UsageSummary> {
  const subscription = await getUserSubscription(userId);
  const used = await getReviewsThisMonth(userId);

  if (subscription.plan === "pro" && subscription.status === "active") {
    return { used, limit: null };
  }

  return { used, limit: FREE_MONTHLY_LIMIT };
}
