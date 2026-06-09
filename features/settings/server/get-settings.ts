import type { UserSettings } from "@/features/settings/types/settings";
import { prisma } from "@/lib/db";

import { getBillingPortalUrl, getUserSubscription } from "./subscription";

export async function getUserSettings(userId: string): Promise<UserSettings> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      email: true,
      image: true,
      createdAt: true,
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  const subscription = await getUserSubscription(userId);

  return {
    profile: {
      name: user.name,
      email: user.email,
      image: user.image,
      memberSince: user.createdAt.toISOString(),
    },
    subscription,
    billingPortalUrl: getBillingPortalUrl(),
  };
}
