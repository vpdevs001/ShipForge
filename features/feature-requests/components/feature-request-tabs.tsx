"use client";

/**
 * FeatureRequestTabs — Client component for the feature request detail hub.
 *
 * Renders three tabs:
 *  1. Chat   — clarification conversation with the AI agent (ChatPanel)
 *  2. PRD    — generated product requirements document (PrdPanel)
 *  3. Tasks  — Kanban board for task breakdown (TasksPanel)
 *
 * This component only wires up the tab shell; each panel owns its own
 * data fetching and mutations. See ./chat-panel.tsx, ./prd-panel.tsx,
 * ./tasks-panel.tsx.
 */

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChatPanel } from "./chat-panel";
import { PrdPanel } from "./prd-panel";
import { TasksPanel } from "./tasks-panel";
import { ChatsIcon, FileTextIcon, CheckSquareIcon } from "@phosphor-icons/react";
import type { InferSelectModel } from "drizzle-orm";
import type { prd, task } from "@/lib/db/schema";

type PrdRow = InferSelectModel<typeof prd> | null;
type TaskRow = InferSelectModel<typeof task>;

type FeatureRequestTabsProps = {
  featureRequestId: string;
  workspaceId: string;
  /** Current status of the feature request (drives which tabs are active). */
  status: string;
  prd: PrdRow;
  tasks: TaskRow[];
};

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
          <ChatsIcon className="size-4" />
          Chat
        </TabsTrigger>
        <TabsTrigger value="prd" className="gap-1.5">
          <FileTextIcon className="size-4" />
          PRD
        </TabsTrigger>
        <TabsTrigger value="tasks" className="gap-1.5">
          <CheckSquareIcon className="size-4" />
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
        <TasksPanel featureRequestId={featureRequestId} initialTasks={tasks} />
      </TabsContent>
    </Tabs>
  );
}
