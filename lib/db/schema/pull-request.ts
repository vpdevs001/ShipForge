import { pgTable, text, integer, timestamp, unique } from "drizzle-orm/pg-core";

export const pullRequest = pgTable(
  "pull_request",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    installationId: integer("installationId").notNull(),
    repoFullName: text("repoFullName").notNull(),
    prNumber: integer("prNumber").notNull(),
    title: text("title").notNull(),
    authorLogin: text("authorLogin"),
    headSha: text("headSha").notNull(),
    baseBranch: text("baseBranch").notNull(),
    status: text("status").notNull(),
    reviewComment: text("reviewComment"),
    reviewedAt: timestamp("reviewedAt"),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  },
  (t) => ({
    unq: unique().on(t.repoFullName, t.prNumber),
  })
);
