import { pgTable, text, integer, timestamp, index } from "drizzle-orm/pg-core";
import { prd } from "./prd";
import { featureRequest } from "./feature-request";
import { workspace } from "../auth/workspace";
import { user } from "../auth/user";
import { taskStatusEnum, taskPriorityEnum, taskSourceEnum } from "../enums";

export const task = pgTable(
  "task",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    prdId: text("prdId")
      .notNull()
      .references(() => prd.id, { onDelete: "cascade" }),
    featureRequestId: text("featureRequestId")
      .notNull()
      .references(() => featureRequest.id, { onDelete: "cascade" }),
    workspaceId: text("workspaceId")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    // null when source = 'prd', set when source = 'review'
    reviewIssueId: text("reviewIssueId"),
    title: text("title").notNull(),
    description: text("description"),
    source: taskSourceEnum("source").notNull().default("prd"),
    status: taskStatusEnum("status").notNull().default("backlog"),
    priority: taskPriorityEnum("priority").notNull().default("medium"),
    assigneeId: text("assigneeId").references(() => user.id, {
      onDelete: "set null",
    }),
    order: integer("order").notNull().default(0),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  },
  (t) => [
    index("idx_task_prd").on(t.prdId),
    index("idx_task_fr").on(t.featureRequestId),
    index("idx_task_status").on(t.status),
  ]
);
