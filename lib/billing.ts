"use server";

import { getServerSession } from "@/features/auth/utils/get-server-session";
import {
  cancelProSubscription,
  createProSubscription,
} from "@/features/billing/server/subscription";
import { redirect } from "next/navigation";

export async function startProSubscription() {
  const session = await getServerSession();

  if (!session) {
    redirect("/sign-in");
  }

  return createProSubscription(session.user.id);
}

export async function cancelSubscription() {
  const session = await getServerSession();

  if (!session) {
    redirect("/sign-in");
  }

  await cancelProSubscription(session.user.id);
}
