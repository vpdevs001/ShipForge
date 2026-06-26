import { pgTable, text, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { featureRequest } from "./feature-request";
import { workspace } from "../auth/workspace";
import { prdStatusEnum } from "../enums";

export const prd = pgTable(
  "prd",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    // 1 PRD per feature request — the sibling of pullRequest
    featureRequestId: text("featureRequestId")
      .notNull()
      .unique()
      .references(() => featureRequest.id, { onDelete: "cascade" }),
    workspaceId: text("workspaceId")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    problemStatement: text("problemStatement"),
    goals: jsonb("goals").$type<string[]>(),
    nonGoals: jsonb("nonGoals").$type<string[]>(),
    userStories:
      jsonb("userStories").$type<
        { actor: string; action: string; benefit: string }[]
      >(),
    acceptanceCriteria: jsonb("acceptanceCriteria").$type<string[]>(),
    edgeCases: jsonb("edgeCases").$type<string[]>(),
    successMetrics: jsonb("successMetrics").$type<string[]>(),
    status: prdStatusEnum("status").notNull().default("draft"),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  },
  (t) => [index("idx_prd_workspace").on(t.workspaceId)]
);
