import { eventType, staticSchema } from "inngest";

export const prdGenerateRequested = eventType("prd/generate.requested", {
  schema: staticSchema<{
    featureRequestId: string;
    workspaceId: string;
  }>(),
});

export const tasksGenerateRequested = eventType("tasks/generate.requested", {
  schema: staticSchema<{
    prdId: string;
    featureRequestId: string;
    workspaceId: string;
  }>(),
});

export const githubPrReceived = eventType("github/pr.received", {
  schema: staticSchema<{
    pullRequestId: string;
  }>(),
});
