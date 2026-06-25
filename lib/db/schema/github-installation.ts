import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";
import { user } from "./user";

export const githubInstallation = pgTable("github_installation", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" })
    .unique(),
  installationId: integer("installationId").notNull().unique(),
  accountLogin: text("accountLogin"),
  accountType: text("accountType"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});
