import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";

export const repoSync = pgTable("repo_sync", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  installationId: integer("installationId").notNull(),
  repoFullName: text("repoFullName").notNull().unique(),
  branch: text("branch").notNull(),
  status: text("status").notNull().default("pending"),
  chunkCount: integer("chunkCount").notNull().default(0),
  syncedAt: timestamp("syncedAt"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});
