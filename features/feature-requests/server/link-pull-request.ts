import { db } from "@/lib/db";
import { featureRequest } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function findFeatureRequestId(
  prBody: string | null,
  branchName: string,
  workspaceId: string
): Promise<string | null> {
  // Strategy 1 — PR body
  const bodyMatch = prBody?.match(/shipflow:\s*(fr_[a-zA-Z0-9\-]+)/i);
  if (bodyMatch) {
    const frId = bodyMatch[1];
    const exists = await verifyFrBelongsToWorkspace(frId, workspaceId);
    if (exists) return frId;
  }

  // Strategy 2 — branch name
  const branchMatch = branchName.match(
    /(?:feature\/|fix\/)?(fr_[a-zA-Z0-9\-]+)/i
  );
  if (branchMatch) {
    const frId = branchMatch[1];
    const exists = await verifyFrBelongsToWorkspace(frId, workspaceId);
    if (exists) return frId;
  }

  return null;
}

async function verifyFrBelongsToWorkspace(frId: string, workspaceId: string) {
  const [fr] = await db
    .select({ id: featureRequest.id })
    .from(featureRequest)
    .where(
      and(
        eq(featureRequest.id, frId),
        eq(featureRequest.workspaceId, workspaceId)
      )
    )
    .limit(1);
  return !!fr;
}
