import { db } from "@/lib/db";
import { relation } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

/**
 * Returns the first workspaceId where the user is owner or member.
 * Used as a temporary bridge while workspace context is being wired
 * into all callers. Once workspace routing is in place, replace call
 * sites with explicit workspaceId parameters.
 */
export async function getPrimaryWorkspaceId(
  userId: string
): Promise<string | null> {
  const [row] = await db
    .select({ objectId: relation.objectId })
    .from(relation)
    .where(
      and(
        eq(relation.subjectType, "user"),
        eq(relation.subjectId, userId),
        eq(relation.objectType, "workspace")
      )
    )
    .limit(1);

  return row?.objectId ?? null;
}
