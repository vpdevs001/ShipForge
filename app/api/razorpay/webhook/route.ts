import { createHmac, timingSafeEqual } from "crypto";

import { db } from "@/lib/db";
import { user as userSchema } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

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

  const [existingUser] = await db
    .select({ id: userSchema.id })
    .from(userSchema)
    .where(eq(userSchema.razorpaySubscriptionId, subscription.id))
    .limit(1);

  const userId = existingUser?.id ?? subscription.notes?.userId ?? null;
  if (!userId) {
    console.error(
      "Razorpay webhook: no user for subscription",
      subscription.id,
      event.event
    );
    return Response.json({ received: true });
  }

  const renewsAt = subscription.current_end
    ? new Date(subscription.current_end * 1000)
    : null;

  if (event.event === "subscription.activated") {
    await db
      .update(userSchema)
      .set({
        plan: "pro",
        razorpaySubscriptionId: subscription.id,
        subscriptionStatus: "active",
        subscriptionRenewsAt: renewsAt,
      })
      .where(eq(userSchema.id, userId));
  }

  if (event.event === "subscription.charged") {
    await db
      .update(userSchema)
      .set({ subscriptionRenewsAt: renewsAt })
      .where(eq(userSchema.id, userId));
  }

  if (event.event === "subscription.cancelled") {
    await db
      .update(userSchema)
      .set({ subscriptionStatus: "canceled" })
      .where(eq(userSchema.id, userId));
  }

  if (event.event === "subscription.halted") {
    await db
      .update(userSchema)
      .set({ subscriptionStatus: "halted" })
      .where(eq(userSchema.id, userId));
  }

  if (event.event === "subscription.completed") {
    await db
      .update(userSchema)
      .set({
        plan: "free",
        subscriptionStatus: "canceled",
        subscriptionRenewsAt: null,
      })
      .where(eq(userSchema.id, userId));
  }

  return Response.json({ received: true });
}
