"use client";

/**
 * PrdPanel — displays the generated PRD for a feature request, with
 * actions to generate one (if missing) and approve it (which kicks off
 * task generation server-side).
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import { statusBadge } from "@/features/dashboard/lib/status-style";
import { FileTextIcon, CheckIcon } from "@phosphor-icons/react";
import type { InferSelectModel } from "drizzle-orm";
import type { prd } from "@/lib/db/schema";

type PrdRow = InferSelectModel<typeof prd> | null;

type PrdPanelProps = {
  featureRequestId: string;
  workspaceId: string;
  initialPrd: PrdRow;
  featureStatus: string;
};

export function PrdPanel({
  featureRequestId,
  workspaceId,
  initialPrd,
  featureStatus,
}: PrdPanelProps) {
  const trpc = useTRPC();
  const qc = useQueryClient();

  const prdQueryOptions = trpc.prd.getByFeatureRequest.queryOptions({
    featureRequestId,
  });

  const prdQuery = useQuery({
    ...prdQueryOptions,
    initialData: initialPrd ?? undefined,
  });

  const generateMutation = useMutation(
    trpc.prd.generate.mutationOptions({
      onSuccess: () => {
        qc.invalidateQueries(prdQueryOptions);
      },
    })
  );

  const approveMutation = useMutation(
    trpc.prd.approve.mutationOptions({
      onSuccess: () => {
        qc.invalidateQueries(prdQueryOptions);
      },
    })
  );

  const currentPrd = prdQuery.data;
  const canGenerate = ["prd_ready", "clarifying", "draft"].includes(
    featureStatus
  );
  const canApprove = currentPrd && currentPrd.status !== "final";

  return (
    <div className="flex flex-col gap-4">
      {/* Action bar */}
      <div className="flex items-center gap-3">
        {canGenerate && !currentPrd && (
          <Button
            size="sm"
            onClick={() =>
              generateMutation.mutate({ featureRequestId, workspaceId })
            }
            disabled={generateMutation.isPending}
          >
            {generateMutation.isPending ? "Generating PRD…" : "Generate PRD"}
          </Button>
        )}
        {canApprove && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => approveMutation.mutate({ id: currentPrd.id })}
            disabled={approveMutation.isPending}
            className="gap-1.5"
          >
            <CheckIcon className="size-4" />
            {approveMutation.isPending
              ? "Approving…"
              : "Approve & Generate Tasks"}
          </Button>
        )}
        {currentPrd?.status === "final" && (
          <span className={statusBadge("success")}>PRD Approved</span>
        )}
      </div>

      {/* PRD document */}
      {!currentPrd ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border py-16 text-center">
          <FileTextIcon className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            No PRD generated yet. Complete the clarification chat and generate
            the PRD above.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-6">
          {/* Problem statement */}
          {currentPrd.problemStatement && (
            <Section title="Problem Statement">
              <p className="text-sm leading-relaxed">
                {currentPrd.problemStatement}
              </p>
            </Section>
          )}

          {/* Goals */}
          {Array.isArray(currentPrd.goals) && currentPrd.goals.length > 0 && (
            <Section title="Goals">
              <ul className="list-disc list-inside space-y-1 text-sm">
                {(currentPrd.goals as string[]).map((g, i) => (
                  <li key={i}>{g}</li>
                ))}
              </ul>
            </Section>
          )}

          {/* Non-goals */}
          {Array.isArray(currentPrd.nonGoals) &&
            currentPrd.nonGoals.length > 0 && (
              <Section title="Non-Goals">
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {(currentPrd.nonGoals as string[]).map((g, i) => (
                    <li key={i}>{g}</li>
                  ))}
                </ul>
              </Section>
            )}

          {/* User stories */}
          {Array.isArray(currentPrd.userStories) &&
            currentPrd.userStories.length > 0 && (
              <Section title="User Stories">
                <ul className="space-y-2 text-sm">
                  {(
                    currentPrd.userStories as {
                      actor: string;
                      action: string;
                      benefit: string;
                    }[]
                  ).map((s, i) => (
                    <li
                      key={i}
                      className="border-l-2 border-primary/40 pl-3 italic text-muted-foreground"
                    >
                      &ldquo;As a{" "}
                      <span className="text-foreground">{s.actor}</span>, I want
                      to {s.action}, so that {s.benefit}.&rdquo;
                    </li>
                  ))}
                </ul>
              </Section>
            )}

          {/* Acceptance criteria */}
          {Array.isArray(currentPrd.acceptanceCriteria) &&
            currentPrd.acceptanceCriteria.length > 0 && (
              <Section title="Acceptance Criteria">
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {(currentPrd.acceptanceCriteria as string[]).map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </Section>
            )}
        </div>
      )}
    </div>
  );
}

/** Simple labeled section for PRD content blocks. */
function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="font-heading text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {title}
      </h3>
      <div className="text-foreground">{children}</div>
    </div>
  );
}
