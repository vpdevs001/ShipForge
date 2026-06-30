/**
 * FeatureRequestTabs — Client component for the feature request detail hub.
 *
 * Renders three tabs:
 *  1. Chat   — clarification conversation with the AI agent
 *  2. PRD    — generated product requirements document (editable, approvable)
 *  3. Tasks  — Kanban board for task breakdown (backlog/todo/in_progress/done)
 *
 * All data is fetched or mutated through tRPC client hooks.
 */

"use client";

import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { statusBadge } from "@/features/dashboard/lib/status-style";
import {
  Chats,
  FileText,
  CheckSquare,
  PaperPlaneRight,
  Spinner,
  Check,
  WarningCircle,
} from "@phosphor-icons/react";
import type { InferSelectModel } from "drizzle-orm";

// ── Type aliases for DB row shapes ───────────────────────────────────────────

type PrdRow = {
  id: string;
  featureRequestId: string;
  workspaceId: string;
  status: string;
  problemStatement: string | null;
  goals: unknown;
  nonGoals: unknown;
  userStories: unknown;
  acceptanceCriteria: unknown;
  createdAt: Date;
} | null;

type TaskRow = {
  id: string;
  featureRequestId: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  order: number;
  source: string;
};

type FeatureRequestTabsProps = {
  featureRequestId: string;
  workspaceId: string;
  /** Current status of the feature request (drives which tabs are active). */
  status: string;
  prd: PrdRow;
  tasks: TaskRow[];
};

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Maps task priority to a badge tone color. */
function priorityTone(
  priority: string
): "danger" | "warning" | "info" | "neutral" {
  if (priority === "critical") return "danger";
  if (priority === "high") return "warning";
  if (priority === "medium") return "info";
  return "neutral";
}

/** Maps task status to a column key. */
const TASK_COLUMNS = [
  { key: "backlog", label: "Backlog" },
  { key: "todo", label: "To Do" },
  { key: "in_progress", label: "In Progress" },
  { key: "done", label: "Done" },
] as const;

type TaskStatus = "backlog" | "todo" | "in_progress" | "done";

// ── Chat panel ───────────────────────────────────────────────────────────────

function ChatPanel({ featureRequestId }: { featureRequestId: string }) {
  const trpc = useTRPC();
  const qc = useQueryClient();
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const messagesQuery = useQuery(
    trpc.chat.getMessages.queryOptions({ featureRequestId })
  );

  const saveMutation = useMutation(
    trpc.chat.saveMessage.mutationOptions({
      onSuccess: () => {
        qc.invalidateQueries(
          trpc.chat.getMessages.queryOptions({ featureRequestId })
        );
      },
    })
  );

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messagesQuery.data]);

  function handleSend() {
    const content = input.trim();
    if (!content) return;
    setInput("");
    saveMutation.mutate({
      featureRequestId,
      role: "user",
      content,
    });
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      {/* Message list */}
      <div className="flex-1 overflow-y-auto rounded-lg border border-border bg-card">
        {messagesQuery.isPending ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Spinner className="size-5 animate-spin" />
          </div>
        ) : (messagesQuery.data?.length ?? 0) === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <Chats className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No messages yet. Start the clarification conversation below.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3 p-4">
            {messagesQuery.data?.map((msg) => (
              <li
                key={msg.id}
                className={`flex flex-col gap-1 rounded-lg px-4 py-3 text-sm ${
                  msg.role === "user"
                    ? "ml-auto max-w-lg bg-primary/10 border border-primary/20 text-foreground"
                    : "mr-auto max-w-xl bg-muted/50 border border-border text-foreground"
                }`}
              >
                <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  {msg.role}
                </span>
                <p className="leading-relaxed whitespace-pre-wrap">
                  {msg.content}
                </p>
              </li>
            ))}
            <div ref={bottomRef} />
          </ul>
        )}
      </div>

      {/* Input bar */}
      <div className="flex gap-2">
        <Textarea
          placeholder="Reply to the AI agent…"
          rows={2}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          className="resize-none"
        />
        <Button
          onClick={handleSend}
          disabled={!input.trim() || saveMutation.isPending}
          className="self-end"
        >
          {saveMutation.isPending ? (
            <Spinner className="size-4 animate-spin" />
          ) : (
            <PaperPlaneRight className="size-4" />
          )}
        </Button>
      </div>
    </div>
  );
}

// ── PRD panel ────────────────────────────────────────────────────────────────

function PrdPanel({
  featureRequestId,
  workspaceId,
  initialPrd,
  featureStatus,
}: {
  featureRequestId: string;
  workspaceId: string;
  initialPrd: PrdRow;
  featureStatus: string;
}) {
  const trpc = useTRPC();
  const qc = useQueryClient();

  const prdQuery = useQuery({
    ...trpc.prd.getByFeatureRequest.queryOptions({ featureRequestId }),
    initialData: initialPrd ?? undefined,
  });

  const generateMutation = useMutation(
    trpc.prd.generate.mutationOptions({
      onSuccess: () => {
        qc.invalidateQueries(
          trpc.prd.getByFeatureRequest.queryOptions({ featureRequestId })
        );
      },
    })
  );

  const approveMutation = useMutation(
    trpc.prd.approve.mutationOptions({
      onSuccess: () => {
        qc.invalidateQueries(
          trpc.prd.getByFeatureRequest.queryOptions({ featureRequestId })
        );
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
            <Check className="size-4" />
            {approveMutation.isPending ? "Approving…" : "Approve & Generate Tasks"}
          </Button>
        )}
        {currentPrd?.status === "final" && (
          <span className={statusBadge("success")}>PRD Approved</span>
        )}
      </div>

      {/* PRD document */}
      {!currentPrd ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border py-16 text-center">
          <FileText className="size-8 text-muted-foreground" />
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

// ── Tasks panel (Kanban) ─────────────────────────────────────────────────────

function TasksPanel({
  featureRequestId,
  initialTasks,
}: {
  featureRequestId: string;
  initialTasks: TaskRow[];
}) {
  const trpc = useTRPC();
  const qc = useQueryClient();

  const tasksQuery = useQuery({
    ...trpc.task.listByFeatureRequest.queryOptions({ featureRequestId }),
    initialData: initialTasks,
  });

  const updateStatusMutation = useMutation(
    trpc.task.updateStatus.mutationOptions({
      onSuccess: () => {
        qc.invalidateQueries(
          trpc.task.listByFeatureRequest.queryOptions({ featureRequestId })
        );
      },
    })
  );

  const tasks = tasksQuery.data ?? [];

  return (
    <div className="flex flex-col gap-4">
      {tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border py-16 text-center">
          <CheckSquare className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            No tasks yet. Approve the PRD to automatically generate the task
            backlog.
          </p>
        </div>
      ) : (
        /* Kanban columns */
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {TASK_COLUMNS.map(({ key, label }) => {
            const columnTasks = tasks.filter((t) => t.status === key);
            return (
              <div
                key={key}
                className="flex flex-col gap-2 rounded-lg border border-border bg-muted/20 p-3"
              >
                {/* Column header */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {label}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {columnTasks.length}
                  </span>
                </div>

                {/* Task cards */}
                <div className="flex flex-col gap-2">
                  {columnTasks.map((t) => (
                    <div
                      key={t.id}
                      className="rounded-md border border-border bg-card p-3 shadow-sm"
                    >
                      <p className="text-xs font-medium text-foreground leading-snug">
                        {t.title}
                      </p>
                      {t.description && (
                        <p className="mt-1 text-[11px] text-muted-foreground leading-snug line-clamp-2">
                          {t.description}
                        </p>
                      )}

                      {/* Priority + status change */}
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <span className={statusBadge(priorityTone(t.priority))}>
                          {t.priority}
                        </span>
                        {/* Move to next status */}
                        {key !== "done" && (
                          <button
                            className="text-[10px] text-primary hover:underline"
                            onClick={() =>
                              updateStatusMutation.mutate({
                                id: t.id,
                                status: nextStatus(key),
                              })
                            }
                          >
                            → {nextLabel(key)}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Returns the next Kanban column for a given task status. */
function nextStatus(current: string): TaskStatus {
  const map: Record<string, TaskStatus> = {
    backlog: "todo",
    todo: "in_progress",
    in_progress: "done",
  };
  return map[current] ?? "done";
}

/** Returns the label for the next Kanban column. */
function nextLabel(current: string): string {
  const map: Record<string, string> = {
    backlog: "To Do",
    todo: "In Progress",
    in_progress: "Done",
  };
  return map[current] ?? "Done";
}

// ── Root component ───────────────────────────────────────────────────────────

export function FeatureRequestTabs({
  featureRequestId,
  workspaceId,
  status,
  prd,
  tasks,
}: FeatureRequestTabsProps) {
  return (
    <Tabs defaultValue="chat" className="flex flex-1 flex-col gap-3">
      <TabsList className="w-fit">
        <TabsTrigger value="chat" className="gap-1.5">
          <Chats className="size-4" />
          Chat
        </TabsTrigger>
        <TabsTrigger value="prd" className="gap-1.5">
          <FileText className="size-4" />
          PRD
        </TabsTrigger>
        <TabsTrigger value="tasks" className="gap-1.5">
          <CheckSquare className="size-4" />
          Tasks
        </TabsTrigger>
      </TabsList>

      <TabsContent value="chat" className="flex-1">
        <ChatPanel featureRequestId={featureRequestId} />
      </TabsContent>

      <TabsContent value="prd">
        <PrdPanel
          featureRequestId={featureRequestId}
          workspaceId={workspaceId}
          initialPrd={prd}
          featureStatus={status}
        />
      </TabsContent>

      <TabsContent value="tasks">
        <TasksPanel
          featureRequestId={featureRequestId}
          initialTasks={tasks}
        />
      </TabsContent>
    </Tabs>
  );
}
