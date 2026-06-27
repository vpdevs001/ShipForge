import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { getUserInstallationId } from "@/features/github/server/installation";
import { getPrimaryWorkspaceId } from "@/lib/db/workspace";
import { triggerRepoSync } from "@/features/repo-sync/server/repo-sync";
import { TRPCError } from "@trpc/server";

export const repoSyncRouter = router({
  sync: protectedProcedure
    .input(
      z.object({
        repoFullName: z.string(),
        branch: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const installationId = await getUserInstallationId(ctx.session.user.id);
      if (!installationId) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message:
            "No GitHub installation found. Please connect your GitHub account.",
        });
      }

      const workspaceId = await getPrimaryWorkspaceId(ctx.session.user.id);
      if (!workspaceId) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "No workspace found. Please select a workspace.",
        });
      }

      await triggerRepoSync(
        installationId,
        input.repoFullName,
        input.branch,
        workspaceId
      );
      return { success: true };
    }),
});
