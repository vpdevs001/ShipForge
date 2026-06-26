import type { UserSubscription } from "@/features/dashboard/lib/types";
import { getRazorpay } from "@/features/billing/lib/razorpay";
import { db } from "@/lib/db";
import { workspaceSubscription, billingPlan } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getPrimaryWorkspaceId } from "@/lib/db/workspace";

export async function getUserSubscription(
  userId: string
): Promise<UserSubscription> {
  const workspaceId = await getPrimaryWorkspaceId(userId);

  if (!workspaceId) {
    return { plan: "free", status: "active", renewsAt: null };
  }

  const [sub] = await db
    .select({
      planName: billingPlan.name,
      status: workspaceSubscription.status,
      currentPeriodEnd: workspaceSubscription.currentPeriodEnd,
    })
    .from(workspaceSubscription)
    .innerJoin(billingPlan, eq(workspaceSubscription.planId, billingPlan.id))
    .where(eq(workspaceSubscription.workspaceId, workspaceId))
    .limit(1);

  if (!sub) {
    return { plan: "free", status: "active", renewsAt: null };
  }

  const renewsAt = sub.currentPeriodEnd?.toISOString() ?? null;

  if (sub.planName !== "pro") {
    return { plan: "free", status: "active", renewsAt };
  }

  if (sub.status === "trialing") {
    return { plan: "free", status: "trialing", renewsAt };
  }

  if (sub.status === "cancelled") {
    const stillActive =
      sub.currentPeriodEnd !== null && sub.currentPeriodEnd > new Date();
    return stillActive
      ? { plan: "pro", status: "active", renewsAt }
      : { plan: "free", status: "canceled", renewsAt };
  }

  if (sub.status === "active") {
    return { plan: "pro", status: "active", renewsAt };
  }

  return { plan: "free", status: "canceled", renewsAt };
}

export async function createProSubscription(userId: string) {
  const workspaceId = await getPrimaryWorkspaceId(userId);
  if (!workspaceId) throw new Error("No workspace found for user.");

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
    notes: { userId, workspaceId },
  });

  // Find the pro plan row
  const [proPlan] = await db
    .select({ id: billingPlan.id })
    .from(billingPlan)
    .where(eq(billingPlan.name, "pro"))
    .limit(1);

  if (!proPlan) throw new Error("Pro billing plan not seeded in database.");

  await db
    .insert(workspaceSubscription)
    .values({
      workspaceId,
      planId: proPlan.id,
      status: "trialing",
      razorpaySubscriptionId: razorpaySubscription.id,
    })
    .onConflictDoUpdate({
      target: workspaceSubscription.workspaceId,
      set: {
        razorpaySubscriptionId: razorpaySubscription.id,
        status: "trialing",
        planId: proPlan.id,
      },
    });

  return { subscriptionId: razorpaySubscription.id };
}

export async function cancelProSubscription(userId: string) {
  const workspaceId = await getPrimaryWorkspaceId(userId);
  if (!workspaceId) throw new Error("No workspace found.");

  const [sub] = await db
    .select({
      razorpaySubscriptionId: workspaceSubscription.razorpaySubscriptionId,
    })
    .from(workspaceSubscription)
    .where(eq(workspaceSubscription.workspaceId, workspaceId))
    .limit(1);

  if (!sub?.razorpaySubscriptionId) {
    throw new Error("No active subscription found.");
  }

  const razorpay = getRazorpay();
  await razorpay.subscriptions.cancel(sub.razorpaySubscriptionId, 1);

  await db
    .update(workspaceSubscription)
    .set({ status: "cancelled" })
    .where(eq(workspaceSubscription.workspaceId, workspaceId));
}
