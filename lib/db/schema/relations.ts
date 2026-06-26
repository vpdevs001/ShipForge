import { relations } from "drizzle-orm";
import { user } from "./auth/user";
import { workspace } from "./auth/workspace";
import { project } from "./github-app/project";
import { githubInstallation } from "./github-app/github-installation";
import { repoSync } from "./github-app/repo-sync";
import { featureRequest } from "./feature-request/feature-request";
import { conversationMessage } from "./feature-request/conversation-message";
import { prd } from "./feature-request/prd";
import { task } from "./feature-request/task";
import { pullRequest } from "./review/pull-request";
import { review } from "./review/review";
import { reviewIssue } from "./review/review-issue";
import { approval } from "./review/approval";
import { workspaceSubscription, tokenUsage, billingPlan } from "./billing";
import { inngestWorkflow } from "./inngest-workflow";

export const userRelations = relations(user, ({ many }) => ({
  workspaces: many(workspace),
  featureRequests: many(featureRequest),
  tasks: many(task),
  approvals: many(approval),
  githubInstallations: many(githubInstallation),
}));

export const workspaceRelations = relations(workspace, ({ one, many }) => ({
  createdBy: one(user, {
    fields: [workspace.createdBy],
    references: [user.id],
  }),
  projects: many(project),
  featureRequests: many(featureRequest),
  subscription: one(workspaceSubscription, {
    fields: [workspace.id],
    references: [workspaceSubscription.workspaceId],
  }),
  tokenUsages: many(tokenUsage),
  githubInstallations: many(githubInstallation),
  inngestWorkflows: many(inngestWorkflow),
}));

export const projectRelations = relations(project, ({ one, many }) => ({
  workspace: one(workspace, {
    fields: [project.workspaceId],
    references: [workspace.id],
  }),
  createdBy: one(user, {
    fields: [project.createdBy],
    references: [user.id],
  }),
  featureRequests: many(featureRequest),
}));

export const featureRequestRelations = relations(
  featureRequest,
  ({ one, many }) => ({
    workspace: one(workspace, {
      fields: [featureRequest.workspaceId],
      references: [workspace.id],
    }),
    project: one(project, {
      fields: [featureRequest.projectId],
      references: [project.id],
    }),
    creator: one(user, {
      fields: [featureRequest.creatorId],
      references: [user.id],
    }),
    // siblings: both children of featureRequest
    prd: one(prd, {
      fields: [featureRequest.id],
      references: [prd.featureRequestId],
    }),
    pullRequests: many(pullRequest),
    conversationMessages: many(conversationMessage),
    tasks: many(task),
    reviews: many(review),
    inngestWorkflows: many(inngestWorkflow),
  })
);

export const conversationMessageRelations = relations(
  conversationMessage,
  ({ one }) => ({
    featureRequest: one(featureRequest, {
      fields: [conversationMessage.featureRequestId],
      references: [featureRequest.id],
    }),
  })
);

export const prdRelations = relations(prd, ({ one, many }) => ({
  featureRequest: one(featureRequest, {
    fields: [prd.featureRequestId],
    references: [featureRequest.id],
  }),
  workspace: one(workspace, {
    fields: [prd.workspaceId],
    references: [workspace.id],
  }),
  tasks: many(task),
  reviews: many(review),
}));

export const taskRelations = relations(task, ({ one }) => ({
  prd: one(prd, {
    fields: [task.prdId],
    references: [prd.id],
  }),
  featureRequest: one(featureRequest, {
    fields: [task.featureRequestId],
    references: [featureRequest.id],
  }),
  workspace: one(workspace, {
    fields: [task.workspaceId],
    references: [workspace.id],
  }),
  assignee: one(user, {
    fields: [task.assigneeId],
    references: [user.id],
  }),
}));

export const pullRequestRelations = relations(pullRequest, ({ one, many }) => ({
  workspace: one(workspace, {
    fields: [pullRequest.workspaceId],
    references: [workspace.id],
  }),
  featureRequest: one(featureRequest, {
    fields: [pullRequest.featureRequestId],
    references: [featureRequest.id],
  }),
  reviews: many(review),
}));

export const reviewRelations = relations(review, ({ one, many }) => ({
  pullRequest: one(pullRequest, {
    fields: [review.pullRequestId],
    references: [pullRequest.id],
  }),
  featureRequest: one(featureRequest, {
    fields: [review.featureRequestId],
    references: [featureRequest.id],
  }),
  prd: one(prd, {
    fields: [review.prdId],
    references: [prd.id],
  }),
  workspace: one(workspace, {
    fields: [review.workspaceId],
    references: [workspace.id],
  }),
  issues: many(reviewIssue),
  approval: one(approval, {
    fields: [review.id],
    references: [approval.reviewId],
  }),
}));

export const reviewIssueRelations = relations(reviewIssue, ({ one }) => ({
  review: one(review, {
    fields: [reviewIssue.reviewId],
    references: [review.id],
  }),
  featureRequest: one(featureRequest, {
    fields: [reviewIssue.featureRequestId],
    references: [featureRequest.id],
  }),
  workspace: one(workspace, {
    fields: [reviewIssue.workspaceId],
    references: [workspace.id],
  }),
}));

export const approvalRelations = relations(approval, ({ one }) => ({
  review: one(review, {
    fields: [approval.reviewId],
    references: [review.id],
  }),
  featureRequest: one(featureRequest, {
    fields: [approval.featureRequestId],
    references: [featureRequest.id],
  }),
  reviewer: one(user, {
    fields: [approval.reviewerId],
    references: [user.id],
  }),
}));

export const workspaceSubscriptionRelations = relations(
  workspaceSubscription,
  ({ one }) => ({
    workspace: one(workspace, {
      fields: [workspaceSubscription.workspaceId],
      references: [workspace.id],
    }),
    plan: one(billingPlan, {
      fields: [workspaceSubscription.planId],
      references: [billingPlan.id],
    }),
  })
);

export const tokenUsageRelations = relations(tokenUsage, ({ one }) => ({
  workspace: one(workspace, {
    fields: [tokenUsage.workspaceId],
    references: [workspace.id],
  }),
  featureRequest: one(featureRequest, {
    fields: [tokenUsage.featureRequestId],
    references: [featureRequest.id],
  }),
}));

export const inngestWorkflowRelations = relations(
  inngestWorkflow,
  ({ one }) => ({
    workspace: one(workspace, {
      fields: [inngestWorkflow.workspaceId],
      references: [workspace.id],
    }),
    featureRequest: one(featureRequest, {
      fields: [inngestWorkflow.featureRequestId],
      references: [featureRequest.id],
    }),
    review: one(review, {
      fields: [inngestWorkflow.reviewId],
      references: [review.id],
    }),
  })
);

export const githubInstallationRelations = relations(
  githubInstallation,
  ({ one }) => ({
    user: one(user, {
      fields: [githubInstallation.userId],
      references: [user.id],
    }),
    workspace: one(workspace, {
      fields: [githubInstallation.workspaceId],
      references: [workspace.id],
    }),
  })
);

export const repoSyncRelations = relations(repoSync, ({ one }) => ({
  workspace: one(workspace, {
    fields: [repoSync.workspaceId],
    references: [workspace.id],
  }),
}));
