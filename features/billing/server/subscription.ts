import type { UserSubscription } from "@/features/dashboard/lib/types";
import { getRazorpay } from "@/features/billing/lib/razorpay";
import { db } from "@/lib/db";
import { user as userSchema } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function getUserSubscription(
  userId: string
): Promise<UserSubscription> {
  const [user] = await db
    .select({
      plan: userSchema.plan,
      subscriptionStatus: userSchema.subscriptionStatus,
      subscriptionRenewsAt: userSchema.subscriptionRenewsAt,
    })
    .from(userSchema)
    .where(eq(userSchema.id, userId))
    .limit(1);

  if (!user) {
    return { plan: "free", status: "active", renewsAt: null };
  }

  const renewsAt = user.subscriptionRenewsAt?.toISOString() ?? null;

  if (user.plan !== "pro") {
    return { plan: "free", status: "active", renewsAt };
  }

  if (user.subscriptionStatus === "pending") {
    return { plan: "free", status: "trialing", renewsAt };
  }

  if (user.subscriptionStatus === "canceled") {
    const stillActive =
      user.subscriptionRenewsAt !== null &&
      user.subscriptionRenewsAt > new Date();

    if (stillActive) {
      return { plan: "pro", status: "active", renewsAt };
    }

    return { plan: "free", status: "canceled", renewsAt };
  }

  if (user.subscriptionStatus === "active") {
    return { plan: "pro", status: "active", renewsAt };
  }

  return { plan: "free", status: "canceled", renewsAt };
}

export async function createProSubscription(userId: string) {
  const subscription = await getUserSubscription(userId);

  if (subscription.plan === "pro" && subscription.status === "active") {
    throw new Error("You already have an active Pro subscription.");
  }

  const planId = process.env.RAZORPAY_PLAN_ID;
  if (!planId) {
    throw new Error("Razorpay plan is not configured.");
  }

  const razorpay = getRazorpay();
  const razorpaySubscription = await razorpay.subscriptions.create({
    plan_id: planId,
    total_count: 12,
    customer_notify: 1,
    notes: { userId },
  });

  await db
    .update(userSchema)
    .set({
      razorpaySubscriptionId: razorpaySubscription.id,
      subscriptionStatus: "pending",
    })
    .where(eq(userSchema.id, userId));

  return { subscriptionId: razorpaySubscription.id };
}

export async function cancelProSubscription(userId: string) {
  const [user] = await db
    .select({ razorpaySubscriptionId: userSchema.razorpaySubscriptionId })
    .from(userSchema)
    .where(eq(userSchema.id, userId))
    .limit(1);

  if (!user?.razorpaySubscriptionId) {
    throw new Error("No active subscription found.");
  }

  const razorpay = getRazorpay();
  await razorpay.subscriptions.cancel(user.razorpaySubscriptionId, 1);

  await db
    .update(userSchema)
    .set({ subscriptionStatus: "canceled" })
    .where(eq(userSchema.id, userId));
}
