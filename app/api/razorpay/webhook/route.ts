import { createHmac, timingSafeEqual } from "crypto";

import { db } from "@/lib/db";
import { workspaceSubscription, billingPlan } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getPrimaryWorkspaceId } from "@/lib/db/workspace";

type RazorpaySubscriptionPayload = {
  id: string;
  current_end?: number;
  notes?: { userId?: string };
};

type RazorpayWebhookBody = {
  event: string;
  payload: {
    subscription?: {
      entity: RazorpaySubscriptionPayload;
    };
  };
};

const HANDLED_EVENTS = new Set([
  "subscription.activated",
  "subscription.charged",
  "subscription.cancelled",
  "subscription.halted",
  "subscription.completed",
]);

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("x-razorpay-signature");
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!secret || !signature) {
    return Response.json({ error: "Invalid signature" }, { status: 401 });
  }

  const expected = createHmac("sha256", secret).update(body).digest("hex");

  if (
    expected.length !== signature.length ||
    !timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
  ) {
    return Response.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: RazorpayWebhookBody;

  try {
    event = JSON.parse(body) as RazorpayWebhookBody;
  } catch {
    return Response.json({ error: "Invalid payload" }, { status: 400 });
  }

  if (!HANDLED_EVENTS.has(event.event)) {
    return Response.json({ received: true });
  }

  const subscription = event.payload.subscription?.entity;
  if (!subscription) {
    return Response.json({ error: "Missing subscription" }, { status: 400 });
  }

  // Look up workspace by razorpaySubscriptionId
  const [existingSub] = await db
    .select({ workspaceId: workspaceSubscription.workspaceId })
    .from(workspaceSubscription)
    .where(eq(workspaceSubscription.razorpaySubscriptionId, subscription.id))
    .limit(1);

  let workspaceId: string | null = existingSub?.workspaceId ?? null;

  // Fallback: notes.userId → workspaceId
  if (!workspaceId && subscription.notes?.userId) {
    workspaceId = await getPrimaryWorkspaceId(subscription.notes.userId);
  }

  if (!workspaceId) {
    console.error(
      "Razorpay webhook: no workspace for subscription",
      subscription.id,
      event.event
    );
    return Response.json({ received: true });
  }

  const renewsAt = subscription.current_end
    ? new Date(subscription.current_end * 1000)
    : null;

  // Find plan IDs once (needed for activated / completed events)
  const [proPlan] = await db
    .select({ id: billingPlan.id })
    .from(billingPlan)
    .where(eq(billingPlan.name, "pro"))
    .limit(1);

  const [freePlan] = await db
    .select({ id: billingPlan.id })
    .from(billingPlan)
    .where(eq(billingPlan.name, "free"))
    .limit(1);

  if (event.event === "subscription.activated") {
    await db
      .update(workspaceSubscription)
      .set({
        planId: proPlan!.id,
        razorpaySubscriptionId: subscription.id,
        status: "active",
        currentPeriodEnd: renewsAt,
      })
      .where(eq(workspaceSubscription.workspaceId, workspaceId));
  }

  if (event.event === "subscription.charged") {
    await db
      .update(workspaceSubscription)
      .set({ currentPeriodEnd: renewsAt })
      .where(eq(workspaceSubscription.workspaceId, workspaceId));
  }

  if (event.event === "subscription.cancelled") {
    await db
      .update(workspaceSubscription)
      .set({ status: "cancelled" })
      .where(eq(workspaceSubscription.workspaceId, workspaceId));
  }

  if (event.event === "subscription.halted") {
    await db
      .update(workspaceSubscription)
      .set({ status: "past_due" })
      .where(eq(workspaceSubscription.workspaceId, workspaceId));
  }

  if (event.event === "subscription.completed") {
    await db
      .update(workspaceSubscription)
      .set({
        planId: freePlan!.id,
        status: "cancelled",
        currentPeriodEnd: null,
      })
      .where(eq(workspaceSubscription.workspaceId, workspaceId));
  }

  return Response.json({ received: true });
}
