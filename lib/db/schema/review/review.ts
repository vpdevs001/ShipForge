import { pgTable, text, integer, timestamp, index } from "drizzle-orm/pg-core";
import { pullRequest } from "./pull-request";
import { featureRequest } from "../feature-request/feature-request";
import { prd } from "../feature-request/prd";
import { workspace } from "../auth/workspace";
import { reviewStatusEnum, reviewVerdictEnum } from "../enums";

export const review = pgTable(
  "review",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    pullRequestId: text("pullRequestId")
      .notNull()
      .references(() => pullRequest.id, { onDelete: "cascade" }),
    featureRequestId: text("featureRequestId")
      .notNull()
      .references(() => featureRequest.id, { onDelete: "cascade" }),
    // snapshot of the PRD at review time — prd can be edited after
    prdId: text("prdId")
      .notNull()
      .references(() => prd.id),
    workspaceId: text("workspaceId")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    status: reviewStatusEnum("status").notNull().default("pending"),
    verdict: reviewVerdictEnum("verdict"),
    tokensUsed: integer("tokensUsed").notNull().default(0),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  },
  (t) => [
    index("idx_review_pr").on(t.pullRequestId),
    index("idx_review_fr").on(t.featureRequestId),
    index("idx_review_workspace").on(t.workspaceId),
  ]
);
