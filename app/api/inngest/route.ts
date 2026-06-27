import { serve } from "inngest/next";
import { inngest } from "@/features/inngest/client";
import { processTask } from "./function";
import { reviewPullRequest } from "@/features/reviews/server/review-pr-function";
import { syncRepoCodebaseFunction } from "@/features/repo-sync/server/repo-sync-function";
import { generatePrdFunction } from "@/features/prd/server/generate-prd";
import { generateTasksFunction } from "@/features/tasks/server/generate-tasks";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    processTask,
    reviewPullRequest,
    syncRepoCodebaseFunction,
    generatePrdFunction,
    generateTasksFunction,
  ],
});
