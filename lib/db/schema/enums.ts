import { pgEnum } from "drizzle-orm/pg-core";

// ── ReBAC ─────────────────────────────────────────────────────────────────────

export const relationObjectTypeEnum = pgEnum("relation_object_type", [
  "workspace",
  "project",
  "feature_request",
]);

export const relationSubjectTypeEnum = pgEnum("relation_subject_type", [
  "user",
]);

export const relationTypeEnum = pgEnum("relation_type", [
  "owner",
  "member",
  "project_member",
  "creator",
  "reviewer",
]);

// ── Workspace ─────────────────────────────────────────────────────────────────

export const workspacePlanEnum = pgEnum("workspace_plan", [
  "free",
  "pro",
  "enterprise",
]);

// ── Feature Request ───────────────────────────────────────────────────────────

export const featureRequestStatusEnum = pgEnum("feature_request_status", [
  "draft",
  "clarifying",
  "prd_generating",
  "prd_ready",
  "planning",
  "in_development",
  "in_review",
  "fix_needed",
  "approved",
  "shipped",
  "rejected",
]);

export const featureRequestSourceEnum = pgEnum("feature_request_source", [
  "form",
  "email",
  "ticket",
]);

// ── Conversation ──────────────────────────────────────────────────────────────

export const conversationRoleEnum = pgEnum("conversation_role", [
  "user",
  "assistant",
]);

// ── PRD ───────────────────────────────────────────────────────────────────────

export const prdStatusEnum = pgEnum("prd_status", ["draft", "final"]);

// ── Task ──────────────────────────────────────────────────────────────────────

export const taskStatusEnum = pgEnum("task_status", [
  "backlog",
  "todo",
  "in_progress",
  "done",
]);

export const taskPriorityEnum = pgEnum("task_priority", [
  "low",
  "medium",
  "high",
  "critical",
]);

export const taskSourceEnum = pgEnum("task_source", ["prd", "review"]);

// ── Pull Request ──────────────────────────────────────────────────────────────

export const pullRequestStatusEnum = pgEnum("pull_request_status", [
  "open",
  "closed",
  "merged",
]);

export const pullRequestReviewStatusEnum = pgEnum(
  "pull_request_review_status",
  ["pending", "processing", "reviewed", "rate_limited", "failed"]
);

// ── Review ────────────────────────────────────────────────────────────────────

export const reviewStatusEnum = pgEnum("review_status", [
  "pending",
  "running",
  "completed",
  "failed",
]);

export const reviewVerdictEnum = pgEnum("review_verdict", [
  "pass",
  "fail",
  "needs_changes",
]);

export const reviewIssueCategoryEnum = pgEnum("review_issue_category", [
  "requirement",
  "security",
  "performance",
  "edge_case",
  "code_quality",
]);

export const reviewIssueSeverityEnum = pgEnum("review_issue_severity", [
  "blocking",
  "non_blocking",
]);

export const reviewIssueStatusEnum = pgEnum("review_issue_status", [
  "open",
  "resolved",
]);

// ── Approval ──────────────────────────────────────────────────────────────────

export const approvalDecisionEnum = pgEnum("approval_decision", [
  "approved",
  "rejected",
]);

// ── Billing ───────────────────────────────────────────────────────────────────

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "active",
  "cancelled",
  "past_due",
  "trialing",
]);

// ── Token Usage ───────────────────────────────────────────────────────────────

export const tokenActionEnum = pgEnum("token_action", [
  "clarification",
  "prd_generation",
  "task_generation",
  "pr_analysis",
  "ai_review",
  "recheck",
  "release_check",
]);

// ── Inngest ───────────────────────────────────────────────────────────────────

export const inngestWorkflowTypeEnum = pgEnum("inngest_workflow_type", [
  "prd_gen",
  "task_gen",
  "pr_analysis",
  "ai_review",
  "re_review",
  "release_check",
]);

export const inngestWorkflowStatusEnum = pgEnum("inngest_workflow_status", [
  "queued",
  "running",
  "completed",
  "failed",
]);

// ── Repo Sync ─────────────────────────────────────────────────────────────────

export const repoSyncStatusEnum = pgEnum("repo_sync_status", [
  "pending",
  "syncing",
  "synced",
  "failed",
]);
