import { router, publicProcedure } from "./init";
import { featureRequestRouter } from "./routers/feature-request";
import { chatRouter } from "./routers/chat";
import { prdRouter } from "./routers/prd";
import { taskRouter } from "./routers/task";
import { githubRouter } from "./routers/github";
import { billingRouter } from "./routers/billing";
import { repoSyncRouter } from "./routers/repo-sync";

export const appRouter = router({
  healthcheck: publicProcedure.query(() => {
    return { status: "ok" };
  }),
  featureRequest: featureRequestRouter,
  chat: chatRouter,
  prd: prdRouter,
  task: taskRouter,
  github: githubRouter,
  billing: billingRouter,
  repoSync: repoSyncRouter,
});

export type AppRouter = typeof appRouter;
