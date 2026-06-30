import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import { pullRequest, review, reviewIssue, approval, featureRequest } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { assertCan } from "@/lib/rebac";

export const reviewRouter = router({
  listPullRequests: protectedProcedure
    .input(z.object({ workspaceId: z.string() }))
    .query(async ({ ctx, input }) => {
      await assertCan(
        ctx.session.user.id,
        "member",
        "workspace",
        input.workspaceId
      );

      return db
        .select()
        .from(pullRequest)
        .where(eq(pullRequest.workspaceId, input.workspaceId))
        .orderBy(desc(pullRequest.createdAt));
    }),

  getReviewDetails: protectedProcedure
    .input(z.object({ pullRequestId: z.string() }))
    .query(async ({ ctx, input }) => {
      const [pr] = await db
        .select()
        .from(pullRequest)
        .where(eq(pullRequest.id, input.pullRequestId))
        .limit(1);

      if (!pr) {
        throw new Error("Pull request not found");
      }

      await assertCan(
        ctx.session.user.id,
        "member",
        "workspace",
        pr.workspaceId
      );

      // Fetch the latest review for this PR
      const [latestReview] = await db
        .select()
        .from(review)
        .where(eq(review.pullRequestId, pr.id))
        .orderBy(desc(review.createdAt))
        .limit(1);

      let issues: typeof reviewIssue.$inferSelect[] = [];
      let prApproval: typeof approval.$inferSelect | null = null;

      if (latestReview) {
        issues = await db
          .select()
          .from(reviewIssue)
          .where(eq(reviewIssue.reviewId, latestReview.id));

        const [existingApproval] = await db
          .select()
          .from(approval)
          .where(eq(approval.reviewId, latestReview.id))
          .limit(1);
        
        prApproval = existingApproval ?? null;
      }

      let associatedRequest = null;
      if (pr.featureRequestId) {
        const [fr] = await db
          .select()
          .from(featureRequest)
          .where(eq(featureRequest.id, pr.featureRequestId))
          .limit(1);
        associatedRequest = fr ?? null;
      }

      return {
        pullRequest: pr,
        review: latestReview ?? null,
        issues,
        approval: prApproval,
        featureRequest: associatedRequest,
      };
    }),

  submitApproval: protectedProcedure
    .input(
      z.object({
        reviewId: z.string(),
        decision: z.enum(["approved", "rejected"]),
        comment: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [rev] = await db
        .select()
        .from(review)
        .where(eq(review.id, input.reviewId))
        .limit(1);

      if (!rev) {
        throw new Error("Review not found");
      }

      await assertCan(
        ctx.session.user.id,
        "creator",
        "feature_request",
        rev.featureRequestId
      );

      // Save the approval decision
      const [appRecord] = await db
        .insert(approval)
        .values({
          reviewId: input.reviewId,
          featureRequestId: rev.featureRequestId,
          workspaceId: rev.workspaceId,
          reviewerId: ctx.session.user.id,
          decision: input.decision,
          comment: input.comment ?? "",
        })
        .onConflictDoUpdate({
          target: approval.reviewId,
          set: {
            decision: input.decision,
            comment: input.comment ?? "",
            createdAt: new Date(),
          },
        })
        .returning();

      // Update the status of the feature request
      const nextStatus = input.decision === "approved" ? "approved" : "fix_needed";
      await db
        .update(featureRequest)
        .set({ status: nextStatus })
        .where(eq(featureRequest.id, rev.featureRequestId));

      return appRecord;
    }),
});
