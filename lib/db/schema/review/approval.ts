import { pgTable, text, timestamp, index } from "drizzle-orm/pg-core";
import { review } from "./review";
import { featureRequest } from "../feature-request/feature-request";
import { workspace } from "../auth/workspace";
import { user } from "../auth/user";
import { approvalDecisionEnum } from "../enums";

export const approval = pgTable(
  "approval",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    // one decision per review
    reviewId: text("reviewId")
      .notNull()
      .unique()
      .references(() => review.id, { onDelete: "cascade" }),
    featureRequestId: text("featureRequestId")
      .notNull()
      .references(() => featureRequest.id, { onDelete: "cascade" }),
    workspaceId: text("workspaceId")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    reviewerId: text("reviewerId")
      .notNull()
      .references(() => user.id),
    decision: approvalDecisionEnum("decision").notNull(),
    comment: text("comment"),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (t) => [index("idx_approval_fr").on(t.featureRequestId)]
);
