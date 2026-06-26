import { pgTable, text, timestamp, index } from "drizzle-orm/pg-core";
import { workspace } from "./auth/workspace";
import { featureRequest } from "./feature-request/feature-request";
import { review } from "./review/review";
import { inngestWorkflowTypeEnum, inngestWorkflowStatusEnum } from "./enums";

export const inngestWorkflow = pgTable(
  "inngest_workflow",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    workspaceId: text("workspaceId")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    featureRequestId: text("featureRequestId").references(
      () => featureRequest.id,
      { onDelete: "set null" }
    ),
    reviewId: text("reviewId").references(() => review.id, {
      onDelete: "set null",
    }),
    type: inngestWorkflowTypeEnum("type").notNull(),
    inngestRunId: text("inngestRunId").notNull(),
    status: inngestWorkflowStatusEnum("status").notNull().default("queued"),
    error: text("error"),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  },
  (t) => [
    index("idx_inngest_fr").on(t.featureRequestId),
    index("idx_inngest_run").on(t.inngestRunId),
  ]
);
