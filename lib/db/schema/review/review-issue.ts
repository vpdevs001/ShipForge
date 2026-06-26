import { pgTable, text, integer, timestamp, index } from "drizzle-orm/pg-core";
import { review } from "./review";
import { featureRequest } from "../feature-request/feature-request";
import { workspace } from "../auth/workspace";
import {
  reviewIssueCategoryEnum,
  reviewIssueSeverityEnum,
  reviewIssueStatusEnum,
} from "../enums";

export const reviewIssue = pgTable(
  "review_issue",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    reviewId: text("reviewId")
      .notNull()
      .references(() => review.id, { onDelete: "cascade" }),
    featureRequestId: text("featureRequestId")
      .notNull()
      .references(() => featureRequest.id, { onDelete: "cascade" }),
    workspaceId: text("workspaceId")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    category: reviewIssueCategoryEnum("category").notNull(),
    severity: reviewIssueSeverityEnum("severity").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    suggestion: text("suggestion"),
    filePath: text("filePath"),
    lineNumber: integer("lineNumber"),
    status: reviewIssueStatusEnum("status").notNull().default("open"),
    // set when a kanban task is created from this issue
    taskId: text("taskId"),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  },
  (t) => [
    index("idx_ri_review").on(t.reviewId),
    index("idx_ri_severity_status").on(t.severity, t.status),
  ]
);
