import { pgTable, text, timestamp, index } from "drizzle-orm/pg-core";
import { workspace } from "../auth/workspace";
import { project } from "../github-app/project";
import { user } from "../auth/user";
import { featureRequestStatusEnum, featureRequestSourceEnum } from "../enums";

export const featureRequest = pgTable(
  "feature_request",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    workspaceId: text("workspaceId")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    projectId: text("projectId")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    creatorId: text("creatorId")
      .notNull()
      .references(() => user.id),
    title: text("title").notNull(),
    rawInput: text("rawInput").notNull(),
    source: featureRequestSourceEnum("source").notNull().default("form"),
    status: featureRequestStatusEnum("status").notNull().default("draft"),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  },
  (t) => [
    index("idx_fr_workspace").on(t.workspaceId),
    index("idx_fr_project").on(t.projectId),
    index("idx_fr_status").on(t.status),
  ]
);
