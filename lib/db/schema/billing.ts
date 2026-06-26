import { pgTable, text, integer, timestamp, index } from "drizzle-orm/pg-core";
import { workspace } from "./auth/workspace";
import { featureRequest } from "./feature-request/feature-request";
import {
  workspacePlanEnum,
  subscriptionStatusEnum,
  tokenActionEnum,
} from "./enums";

export const billingPlan = pgTable("billing_plan", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: workspacePlanEnum("name").notNull().unique(),
  monthlyTokenLimit: integer("monthlyTokenLimit").notNull(),
  reviewLimit: integer("reviewLimit").notNull(),
  repositoryLimit: integer("repositoryLimit").notNull(),
  // Razorpay uses smallest currency unit (paise for INR)
  priceInPaise: integer("priceInPaise").notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});

export const workspaceSubscription = pgTable("workspace_subscription", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  // one active subscription per workspace
  workspaceId: text("workspaceId")
    .notNull()
    .unique()
    .references(() => workspace.id, { onDelete: "cascade" }),
  planId: text("planId")
    .notNull()
    .references(() => billingPlan.id),
  status: subscriptionStatusEnum("status").notNull().default("trialing"),
  razorpaySubscriptionId: text("razorpaySubscriptionId"),
  razorpayCustomerId: text("razorpayCustomerId"),
  currentPeriodStart: timestamp("currentPeriodStart"),
  currentPeriodEnd: timestamp("currentPeriodEnd"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

// Append-only log. Sum by workspaceId + billing period to enforce limits.
export const tokenUsage = pgTable(
  "token_usage",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    workspaceId: text("workspaceId")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    featureRequestId: text("featureRequestId").references(
      () => featureRequest.id,
      { onDelete: "set null" }
    ),
    action: tokenActionEnum("action").notNull(),
    tokensUsed: integer("tokensUsed").notNull(),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (t) => [
    // fast aggregation for limit checks
    index("idx_token_workspace_created").on(t.workspaceId, t.createdAt),
  ]
);
