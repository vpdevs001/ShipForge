import { pgTable, text, integer, timestamp, index } from "drizzle-orm/pg-core";
import { workspace } from "../auth/workspace";
import { repoSyncStatusEnum } from "../enums";

export const repoSync = pgTable(
  "repo_sync",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    workspaceId: text("workspaceId")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    installationId: integer("installationId").notNull(),
    repoFullName: text("repoFullName").notNull().unique(),
    branch: text("branch").notNull(),
    status: repoSyncStatusEnum("status").notNull().default("pending"),
    chunkCount: integer("chunkCount").notNull().default(0),
    syncedAt: timestamp("syncedAt"),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  },
  (t) => [index("idx_repo_sync_workspace").on(t.workspaceId)]
);
