import { db } from "@/lib/db";
import { featureRequest } from "@/lib/db/schema";
import { grantAccess } from "@/lib/rebac";

type CreateFeatureRequestInput = {
  workspaceId: string;
  projectId: string;
  creatorId: string;
  title: string;
  rawInput: string;
  source?: "form" | "email" | "ticket";
};

export async function createFeatureRequest(input: CreateFeatureRequestInput) {
  // 1. Insert featureRequest row
  const [fr] = await db
    .insert(featureRequest)
    .values({
      workspaceId: input.workspaceId,
      projectId: input.projectId,
      creatorId: input.creatorId,
      title: input.title,
      rawInput: input.rawInput,
      source: input.source ?? "form",
      status: "draft",
    })
    .returning();

  // 2. Write ReBAC tuple
  await grantAccess(input.creatorId, "creator", "feature_request", fr.id);

  // 3. Return featureRequest
  return fr;
}
