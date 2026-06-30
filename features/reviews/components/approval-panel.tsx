/**
 * ApprovalPanel — client component for the human reviewer's approve/reject
 * action on a PR review.
 *
 * Shown below the AI review issues. Lets the reviewer make the final decision
 * with an optional comment, then submits via tRPC `review.submitApproval`.
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { statusBadge } from "@/features/dashboard/lib/status-style";
import { CheckIcon, XIcon } from "@phosphor-icons/react";

type ExistingApproval = {
  id: string;
  decision: string;
  comment: string | null;
  createdAt: Date;
} | null;

type ApprovalPanelProps = {
  reviewId: string;
  existingApproval: ExistingApproval;
};

export function ApprovalPanel({ reviewId, existingApproval }: ApprovalPanelProps) {
  const trpc = useTRPC();
  const router = useRouter();
  const [comment, setComment] = useState(existingApproval?.comment ?? "");
  const [submitted, setSubmitted] = useState(!!existingApproval);

  const submitMutation = useMutation(
    trpc.review.submitApproval.mutationOptions({
      onSuccess: () => {
        setSubmitted(true);
        // The parent route is a Server Component — refresh it so the
        // feature request's updated status reflects immediately.
        router.refresh();
      },
    })
  );

  function submit(decision: "approved" | "rejected") {
    submitMutation.mutate({
      reviewId,
      decision,
      comment: comment.trim() || undefined,
    });
  }

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <h3 className="font-heading text-sm font-semibold text-foreground">
        Human Review Decision
      </h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Override the AI verdict with your final call. This decision will update
        the feature request status.
      </p>

      {/* Show existing decision */}
      {existingApproval && (
        <div className="mt-3 flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Decision:</span>
          <span
            className={statusBadge(
              existingApproval.decision === "approved" ? "success" : "danger"
            )}
          >
            {existingApproval.decision}
          </span>
        </div>
      )}

      {/* Approval form */}
      {!submitted && (
        <div className="mt-4 flex flex-col gap-3">
          <Textarea
            placeholder="Optional comment for the team…"
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="resize-none"
          />

          {submitMutation.isError && (
            <p className="text-xs text-destructive">
              {submitMutation.error?.message ?? "Failed to submit decision."}
            </p>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 border-green-500/40 text-green-700 hover:border-green-500/60 hover:bg-green-500/10 dark:text-green-400"
              onClick={() => submit("approved")}
              disabled={submitMutation.isPending}
            >
              <CheckIcon className="size-4" />
              Approve
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 border-red-500/40 text-red-700 hover:border-red-500/60 hover:bg-red-500/10 dark:text-red-400"
              onClick={() => submit("rejected")}
              disabled={submitMutation.isPending}
            >
              <XIcon className="size-4" />
              Request Changes
            </Button>
          </div>
        </div>
      )}

      {/* Success state */}
      {submitted && !existingApproval && (
        <p className="mt-3 text-xs text-muted-foreground">
          Decision submitted. The feature request status has been updated.
        </p>
      )}
    </div>
  );
}
