"use client";

/**
 * TasksPanel — Kanban board for the task breakdown of a feature request.
 * Columns: backlog → todo → in_progress → done.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { statusBadge } from "@/features/dashboard/lib/status-style";
import { CheckSquareIcon } from "@phosphor-icons/react";
import type { InferSelectModel } from "drizzle-orm";
import type { task } from "@/lib/db/schema";

type TaskRow = InferSelectModel<typeof task>;

type TaskStatus = "backlog" | "todo" | "in_progress" | "done";

const TASK_COLUMNS = [
  { key: "backlog", label: "Backlog" },
  { key: "todo", label: "To Do" },
  { key: "in_progress", label: "In Progress" },
  { key: "done", label: "Done" },
] as const;

/** Maps task priority to a badge tone color. */
function priorityTone(
  priority: string
): "danger" | "warning" | "info" | "neutral" {
  if (priority === "critical") return "danger";
  if (priority === "high") return "warning";
  if (priority === "medium") return "info";
  return "neutral";
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

type TasksPanelProps = {
  featureRequestId: string;
  initialTasks: TaskRow[];
};

export function TasksPanel({
  featureRequestId,
  initialTasks,
}: TasksPanelProps) {
  const trpc = useTRPC();
  const qc = useQueryClient();

  const tasksQueryOptions = trpc.task.listByFeatureRequest.queryOptions({
    featureRequestId,
  });

  const tasksQuery = useQuery({
    ...tasksQueryOptions,
    initialData: initialTasks,
  });

  const updateStatusMutation = useMutation(
    trpc.task.updateStatus.mutationOptions({
      onSuccess: () => {
        qc.invalidateQueries(tasksQueryOptions);
      },
    })
  );

  const tasks = tasksQuery.data ?? [];

  return (
    <div className="flex flex-col gap-4">
      {tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border py-16 text-center">
          <CheckSquareIcon className="size-8 text-muted-foreground" />
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
