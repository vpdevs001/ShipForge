import { pgTable, text, integer, timestamp, index } from "drizzle-orm/pg-core";
import { user } from "../auth/user";
import { workspace } from "../auth/workspace";

export const githubInstallation = pgTable(
  "github_installation",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    workspaceId: text("workspaceId")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    installationId: integer("installationId").notNull().unique(),
    accountLogin: text("accountLogin"),
    accountType: text("accountType"),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  },
  (t) => [index("idx_github_installation_workspace").on(t.workspaceId)]
);
