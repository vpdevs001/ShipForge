CREATE TYPE "public"."approval_decision" AS ENUM('approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."conversation_role" AS ENUM('user', 'assistant');--> statement-breakpoint
CREATE TYPE "public"."feature_request_source" AS ENUM('form', 'email', 'ticket');--> statement-breakpoint
CREATE TYPE "public"."feature_request_status" AS ENUM('draft', 'clarifying', 'prd_generating', 'prd_ready', 'planning', 'in_development', 'in_review', 'fix_needed', 'approved', 'shipped', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."inngest_workflow_status" AS ENUM('queued', 'running', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."inngest_workflow_type" AS ENUM('prd_gen', 'task_gen', 'pr_analysis', 'ai_review', 're_review', 'release_check');--> statement-breakpoint
CREATE TYPE "public"."prd_status" AS ENUM('draft', 'final');--> statement-breakpoint
CREATE TYPE "public"."pull_request_review_status" AS ENUM('pending', 'processing', 'reviewed', 'rate_limited', 'failed');--> statement-breakpoint
CREATE TYPE "public"."pull_request_status" AS ENUM('open', 'closed', 'merged');--> statement-breakpoint
CREATE TYPE "public"."relation_object_type" AS ENUM('workspace', 'project', 'feature_request');--> statement-breakpoint
CREATE TYPE "public"."relation_subject_type" AS ENUM('user');--> statement-breakpoint
CREATE TYPE "public"."relation_type" AS ENUM('owner', 'member', 'project_member', 'creator', 'reviewer');--> statement-breakpoint
CREATE TYPE "public"."repo_sync_status" AS ENUM('pending', 'syncing', 'synced', 'failed');--> statement-breakpoint
CREATE TYPE "public"."review_issue_category" AS ENUM('requirement', 'security', 'performance', 'edge_case', 'code_quality');--> statement-breakpoint
CREATE TYPE "public"."review_issue_severity" AS ENUM('blocking', 'non_blocking');--> statement-breakpoint
CREATE TYPE "public"."review_issue_status" AS ENUM('open', 'resolved');--> statement-breakpoint
CREATE TYPE "public"."review_status" AS ENUM('pending', 'running', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."review_verdict" AS ENUM('pass', 'fail', 'needs_changes');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('active', 'cancelled', 'past_due', 'trialing');--> statement-breakpoint
CREATE TYPE "public"."task_priority" AS ENUM('low', 'medium', 'high', 'critical');--> statement-breakpoint
CREATE TYPE "public"."task_source" AS ENUM('prd', 'review');--> statement-breakpoint
CREATE TYPE "public"."task_status" AS ENUM('backlog', 'todo', 'in_progress', 'done');--> statement-breakpoint
CREATE TYPE "public"."token_action" AS ENUM('clarification', 'prd_generation', 'task_generation', 'pr_analysis', 'ai_review', 'recheck', 'release_check');--> statement-breakpoint
CREATE TYPE "public"."workspace_plan" AS ENUM('free', 'pro', 'enterprise');--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"emailVerified" boolean NOT NULL,
	"image" text,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"token" text NOT NULL,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL,
	"ipAddress" text,
	"userAgent" text,
	"userId" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"accountId" text NOT NULL,
	"providerId" text NOT NULL,
	"userId" text NOT NULL,
	"accessToken" text,
	"refreshToken" text,
	"idToken" text,
	"accessTokenExpiresAt" timestamp,
	"refreshTokenExpiresAt" timestamp,
	"scope" text,
	"password" text,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"createdAt" timestamp,
	"updatedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "workspace" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"createdBy" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "relation" (
	"id" text PRIMARY KEY NOT NULL,
	"subjectType" "relation_subject_type" NOT NULL,
	"subjectId" text NOT NULL,
	"relation" "relation_type" NOT NULL,
	"objectType" "relation_object_type" NOT NULL,
	"objectId" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project" (
	"id" text PRIMARY KEY NOT NULL,
	"workspaceId" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"createdBy" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "github_installation" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"workspaceId" text NOT NULL,
	"installationId" integer NOT NULL,
	"accountLogin" text,
	"accountType" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "github_installation_installationId_unique" UNIQUE("installationId")
);
--> statement-breakpoint
CREATE TABLE "repo_sync" (
	"id" text PRIMARY KEY NOT NULL,
	"workspaceId" text NOT NULL,
	"installationId" integer NOT NULL,
	"repoFullName" text NOT NULL,
	"branch" text NOT NULL,
	"status" "repo_sync_status" DEFAULT 'pending' NOT NULL,
	"chunkCount" integer DEFAULT 0 NOT NULL,
	"syncedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "repo_sync_repoFullName_unique" UNIQUE("repoFullName")
);
--> statement-breakpoint
CREATE TABLE "feature_request" (
	"id" text PRIMARY KEY NOT NULL,
	"workspaceId" text NOT NULL,
	"projectId" text NOT NULL,
	"creatorId" text NOT NULL,
	"title" text NOT NULL,
	"rawInput" text NOT NULL,
	"source" "feature_request_source" DEFAULT 'form' NOT NULL,
	"status" "feature_request_status" DEFAULT 'draft' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversation_message" (
	"id" text PRIMARY KEY NOT NULL,
	"featureRequestId" text NOT NULL,
	"role" "conversation_role" NOT NULL,
	"content" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prd" (
	"id" text PRIMARY KEY NOT NULL,
	"featureRequestId" text NOT NULL,
	"workspaceId" text NOT NULL,
	"problemStatement" text,
	"goals" jsonb,
	"nonGoals" jsonb,
	"userStories" jsonb,
	"acceptanceCriteria" jsonb,
	"edgeCases" jsonb,
	"successMetrics" jsonb,
	"status" "prd_status" DEFAULT 'draft' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "prd_featureRequestId_unique" UNIQUE("featureRequestId")
);
--> statement-breakpoint
CREATE TABLE "task" (
	"id" text PRIMARY KEY NOT NULL,
	"prdId" text NOT NULL,
	"featureRequestId" text NOT NULL,
	"workspaceId" text NOT NULL,
	"reviewIssueId" text,
	"title" text NOT NULL,
	"description" text,
	"source" "task_source" DEFAULT 'prd' NOT NULL,
	"status" "task_status" DEFAULT 'backlog' NOT NULL,
	"priority" "task_priority" DEFAULT 'medium' NOT NULL,
	"assigneeId" text,
	"order" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pull_request" (
	"id" text PRIMARY KEY NOT NULL,
	"workspaceId" text NOT NULL,
	"featureRequestId" text,
	"installationId" integer NOT NULL,
	"repoFullName" text NOT NULL,
	"prNumber" integer NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"authorLogin" text,
	"headSha" text NOT NULL,
	"baseBranch" text NOT NULL,
	"url" text,
	"status" "pull_request_status" DEFAULT 'open' NOT NULL,
	"reviewStatus" "pull_request_review_status" DEFAULT 'pending' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"reviewedAt" timestamp,
	"mergedAt" timestamp,
	CONSTRAINT "uq_pr_repo_number" UNIQUE("repoFullName","prNumber")
);
--> statement-breakpoint
CREATE TABLE "review" (
	"id" text PRIMARY KEY NOT NULL,
	"pullRequestId" text NOT NULL,
	"featureRequestId" text NOT NULL,
	"prdId" text NOT NULL,
	"workspaceId" text NOT NULL,
	"status" "review_status" DEFAULT 'pending' NOT NULL,
	"verdict" "review_verdict",
	"tokensUsed" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "review_issue" (
	"id" text PRIMARY KEY NOT NULL,
	"reviewId" text NOT NULL,
	"featureRequestId" text NOT NULL,
	"workspaceId" text NOT NULL,
	"category" "review_issue_category" NOT NULL,
	"severity" "review_issue_severity" NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"suggestion" text,
	"filePath" text,
	"lineNumber" integer,
	"status" "review_issue_status" DEFAULT 'open' NOT NULL,
	"taskId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "approval" (
	"id" text PRIMARY KEY NOT NULL,
	"reviewId" text NOT NULL,
	"featureRequestId" text NOT NULL,
	"workspaceId" text NOT NULL,
	"reviewerId" text NOT NULL,
	"decision" "approval_decision" NOT NULL,
	"comment" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "approval_reviewId_unique" UNIQUE("reviewId")
);
--> statement-breakpoint
CREATE TABLE "billing_plan" (
	"id" text PRIMARY KEY NOT NULL,
	"name" "workspace_plan" NOT NULL,
	"monthlyTokenLimit" integer NOT NULL,
	"reviewLimit" integer NOT NULL,
	"repositoryLimit" integer NOT NULL,
	"priceInPaise" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "billing_plan_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "token_usage" (
	"id" text PRIMARY KEY NOT NULL,
	"workspaceId" text NOT NULL,
	"featureRequestId" text,
	"action" "token_action" NOT NULL,
	"tokensUsed" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspace_subscription" (
	"id" text PRIMARY KEY NOT NULL,
	"workspaceId" text NOT NULL,
	"planId" text NOT NULL,
	"status" "subscription_status" DEFAULT 'trialing' NOT NULL,
	"razorpaySubscriptionId" text,
	"razorpayCustomerId" text,
	"currentPeriodStart" timestamp,
	"currentPeriodEnd" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_subscription_workspaceId_unique" UNIQUE("workspaceId")
);
--> statement-breakpoint
CREATE TABLE "inngest_workflow" (
	"id" text PRIMARY KEY NOT NULL,
	"workspaceId" text NOT NULL,
	"featureRequestId" text,
	"reviewId" text,
	"type" "inngest_workflow_type" NOT NULL,
	"inngestRunId" text NOT NULL,
	"status" "inngest_workflow_status" DEFAULT 'queued' NOT NULL,
	"error" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace" ADD CONSTRAINT "workspace_createdBy_user_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_workspaceId_workspace_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_createdBy_user_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "github_installation" ADD CONSTRAINT "github_installation_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "github_installation" ADD CONSTRAINT "github_installation_workspaceId_workspace_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repo_sync" ADD CONSTRAINT "repo_sync_workspaceId_workspace_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feature_request" ADD CONSTRAINT "feature_request_workspaceId_workspace_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feature_request" ADD CONSTRAINT "feature_request_projectId_project_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feature_request" ADD CONSTRAINT "feature_request_creatorId_user_id_fk" FOREIGN KEY ("creatorId") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_message" ADD CONSTRAINT "conversation_message_featureRequestId_feature_request_id_fk" FOREIGN KEY ("featureRequestId") REFERENCES "public"."feature_request"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prd" ADD CONSTRAINT "prd_featureRequestId_feature_request_id_fk" FOREIGN KEY ("featureRequestId") REFERENCES "public"."feature_request"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prd" ADD CONSTRAINT "prd_workspaceId_workspace_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_prdId_prd_id_fk" FOREIGN KEY ("prdId") REFERENCES "public"."prd"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_featureRequestId_feature_request_id_fk" FOREIGN KEY ("featureRequestId") REFERENCES "public"."feature_request"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_workspaceId_workspace_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_assigneeId_user_id_fk" FOREIGN KEY ("assigneeId") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pull_request" ADD CONSTRAINT "pull_request_workspaceId_workspace_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pull_request" ADD CONSTRAINT "pull_request_featureRequestId_feature_request_id_fk" FOREIGN KEY ("featureRequestId") REFERENCES "public"."feature_request"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review" ADD CONSTRAINT "review_pullRequestId_pull_request_id_fk" FOREIGN KEY ("pullRequestId") REFERENCES "public"."pull_request"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review" ADD CONSTRAINT "review_featureRequestId_feature_request_id_fk" FOREIGN KEY ("featureRequestId") REFERENCES "public"."feature_request"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review" ADD CONSTRAINT "review_prdId_prd_id_fk" FOREIGN KEY ("prdId") REFERENCES "public"."prd"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review" ADD CONSTRAINT "review_workspaceId_workspace_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_issue" ADD CONSTRAINT "review_issue_reviewId_review_id_fk" FOREIGN KEY ("reviewId") REFERENCES "public"."review"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_issue" ADD CONSTRAINT "review_issue_featureRequestId_feature_request_id_fk" FOREIGN KEY ("featureRequestId") REFERENCES "public"."feature_request"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_issue" ADD CONSTRAINT "review_issue_workspaceId_workspace_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval" ADD CONSTRAINT "approval_reviewId_review_id_fk" FOREIGN KEY ("reviewId") REFERENCES "public"."review"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval" ADD CONSTRAINT "approval_featureRequestId_feature_request_id_fk" FOREIGN KEY ("featureRequestId") REFERENCES "public"."feature_request"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval" ADD CONSTRAINT "approval_workspaceId_workspace_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval" ADD CONSTRAINT "approval_reviewerId_user_id_fk" FOREIGN KEY ("reviewerId") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "token_usage" ADD CONSTRAINT "token_usage_workspaceId_workspace_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "token_usage" ADD CONSTRAINT "token_usage_featureRequestId_feature_request_id_fk" FOREIGN KEY ("featureRequestId") REFERENCES "public"."feature_request"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_subscription" ADD CONSTRAINT "workspace_subscription_workspaceId_workspace_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_subscription" ADD CONSTRAINT "workspace_subscription_planId_billing_plan_id_fk" FOREIGN KEY ("planId") REFERENCES "public"."billing_plan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inngest_workflow" ADD CONSTRAINT "inngest_workflow_workspaceId_workspace_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inngest_workflow" ADD CONSTRAINT "inngest_workflow_featureRequestId_feature_request_id_fk" FOREIGN KEY ("featureRequestId") REFERENCES "public"."feature_request"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inngest_workflow" ADD CONSTRAINT "inngest_workflow_reviewId_review_id_fk" FOREIGN KEY ("reviewId") REFERENCES "public"."review"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_workspace_slug" ON "workspace" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_relation_tuple" ON "relation" USING btree ("subjectType","subjectId","relation","objectType","objectId");--> statement-breakpoint
CREATE INDEX "idx_relation_subject" ON "relation" USING btree ("subjectType","subjectId","objectType");--> statement-breakpoint
CREATE INDEX "idx_relation_object" ON "relation" USING btree ("objectType","objectId","relation");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_project_slug_workspace" ON "project" USING btree ("workspaceId","slug");--> statement-breakpoint
CREATE INDEX "idx_project_workspace" ON "project" USING btree ("workspaceId");--> statement-breakpoint
CREATE INDEX "idx_github_installation_workspace" ON "github_installation" USING btree ("workspaceId");--> statement-breakpoint
CREATE INDEX "idx_repo_sync_workspace" ON "repo_sync" USING btree ("workspaceId");--> statement-breakpoint
CREATE INDEX "idx_fr_workspace" ON "feature_request" USING btree ("workspaceId");--> statement-breakpoint
CREATE INDEX "idx_fr_project" ON "feature_request" USING btree ("projectId");--> statement-breakpoint
CREATE INDEX "idx_fr_status" ON "feature_request" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_conv_message_fr" ON "conversation_message" USING btree ("featureRequestId");--> statement-breakpoint
CREATE INDEX "idx_prd_workspace" ON "prd" USING btree ("workspaceId");--> statement-breakpoint
CREATE INDEX "idx_task_prd" ON "task" USING btree ("prdId");--> statement-breakpoint
CREATE INDEX "idx_task_fr" ON "task" USING btree ("featureRequestId");--> statement-breakpoint
CREATE INDEX "idx_task_status" ON "task" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_pr_workspace" ON "pull_request" USING btree ("workspaceId");--> statement-breakpoint
CREATE INDEX "idx_pr_fr" ON "pull_request" USING btree ("featureRequestId");--> statement-breakpoint
CREATE INDEX "idx_pr_status" ON "pull_request" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_review_pr" ON "review" USING btree ("pullRequestId");--> statement-breakpoint
CREATE INDEX "idx_review_fr" ON "review" USING btree ("featureRequestId");--> statement-breakpoint
CREATE INDEX "idx_review_workspace" ON "review" USING btree ("workspaceId");--> statement-breakpoint
CREATE INDEX "idx_ri_review" ON "review_issue" USING btree ("reviewId");--> statement-breakpoint
CREATE INDEX "idx_ri_severity_status" ON "review_issue" USING btree ("severity","status");--> statement-breakpoint
CREATE INDEX "idx_approval_fr" ON "approval" USING btree ("featureRequestId");--> statement-breakpoint
CREATE INDEX "idx_token_workspace_created" ON "token_usage" USING btree ("workspaceId","createdAt");--> statement-breakpoint
CREATE INDEX "idx_inngest_fr" ON "inngest_workflow" USING btree ("featureRequestId");--> statement-breakpoint
CREATE INDEX "idx_inngest_run" ON "inngest_workflow" USING btree ("inngestRunId");