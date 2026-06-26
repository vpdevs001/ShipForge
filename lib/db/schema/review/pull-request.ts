import {
  pgTable,
  text,
  integer,
  timestamp,
  unique,
  index,
} from "drizzle-orm/pg-core";
import { workspace } from "../auth/workspace";
import { featureRequest } from "../feature-request/feature-request";
import { pullRequestStatusEnum, pullRequestReviewStatusEnum } from "../enums";

export const pullRequest = pgTable(
  "pull_request",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    workspaceId: text("workspaceId")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    // nullable — PRs can arrive via webhook before being linked to a FR
    featureRequestId: text("featureRequestId").references(
      () => featureRequest.id,
      { onDelete: "set null" }
    ),
    installationId: integer("installationId").notNull(),
    repoFullName: text("repoFullName").notNull(),
    prNumber: integer("prNumber").notNull(),
    title: text("title").notNull(),
    body: text("body"),
    authorLogin: text("authorLogin"),
    headSha: text("headSha").notNull(),
    baseBranch: text("baseBranch").notNull(),
    url: text("url"),
    status: pullRequestStatusEnum("status").notNull().default("open"),
    reviewStatus: pullRequestReviewStatusEnum("reviewStatus")
      .notNull()
      .default("pending"),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
    reviewedAt: timestamp("reviewedAt"),
    mergedAt: timestamp("mergedAt"),
  },
  (t) => [
    unique("uq_pr_repo_number").on(t.repoFullName, t.prNumber),
    index("idx_pr_workspace").on(t.workspaceId),
    index("idx_pr_fr").on(t.featureRequestId),
    index("idx_pr_status").on(t.status),
  ]
);
