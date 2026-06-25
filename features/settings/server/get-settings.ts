import { getUserSubscription } from "@/features/billing/server/subscription";
import { getUsageSummary } from "@/features/billing/server/usage";
import { db } from "@/lib/db";
import { user as userSchema } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { UserSettings } from "../types";

export async function getUserSettings(userId: string): Promise<UserSettings> {
  const [user] = await db
    .select({
      name: userSchema.name,
      email: userSchema.email,
      image: userSchema.image,
      createdAt: userSchema.createdAt,
    })
    .from(userSchema)
    .where(eq(userSchema.id, userId));

  if (!user) {
    throw new Error("User not found");
  }

  const subscription = await getUserSubscription(userId);
  const usage = await getUsageSummary(userId);

  return {
    profile: {
      name: user.name,
      email: user.email,
      image: user.image,
      memberSince: user.createdAt.toISOString(),
    },
    subscription,
    usage,
  };
}
