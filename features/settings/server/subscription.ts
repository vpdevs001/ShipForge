import type { UserSubscription } from "@/features/dashboard/lib/types";

export function getBillingPortalUrl(): string | null {
  const url = process.env.BILLING_PORTAL_URL;
  if (!url) {
    return null;
  }
  return url;
}

export async function getUserSubscription(
  _userId: string
): Promise<UserSubscription> {
  // Replace with Stripe / LemonSqueezy lookup when billing is added.
  return {
    plan: "pro",
    status: "active",
    renewsAt: "2026-07-04T00:00:00.000Z",
  };
}
