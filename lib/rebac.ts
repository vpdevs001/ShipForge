import { db } from "@/lib/db";
import { relation } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export async function checkCan(
  userId: string,
  relationType: "owner" | "member" | "project_member" | "creator" | "reviewer",
  objectType: "workspace" | "project" | "feature_request",
  objectId: string
) {
  const [rel] = await db
    .select()
    .from(relation)
    .where(
      and(
        eq(relation.subjectType, "user"),
        eq(relation.subjectId, userId),
        eq(relation.relation, relationType),
        eq(relation.objectType, objectType),
        eq(relation.objectId, objectId)
      )
    )
    .limit(1);

  return !!rel;
}

export async function assertCan(
  userId: string,
  relationType: "owner" | "member" | "project_member" | "creator" | "reviewer",
  objectType: "workspace" | "project" | "feature_request",
  objectId: string
) {
  const hasAccess = await checkCan(userId, relationType, objectType, objectId);
  if (!hasAccess) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `Missing ${relationType} access on ${objectType}:${objectId}`,
    });
  }
}

export async function grantAccess(
  userId: string,
  relationType: "owner" | "member" | "project_member" | "creator" | "reviewer",
  objectType: "workspace" | "project" | "feature_request",
  objectId: string
) {
  await db
    .insert(relation)
    .values({
      subjectType: "user",
      subjectId: userId,
      relation: relationType,
      objectType,
      objectId,
    })
    .onConflictDoNothing();
}
