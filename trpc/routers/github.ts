import { router, protectedProcedure } from "../init";
import { deleteInstallation } from "@/features/github/server/installation";

export const githubRouter = router({
  disconnect: protectedProcedure.mutation(async ({ ctx }) => {
    await deleteInstallation(ctx.session.user.id);
    return { success: true };
  }),
});
