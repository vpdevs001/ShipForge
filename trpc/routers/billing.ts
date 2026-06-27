import { router, protectedProcedure } from "../init";
import {
  createProSubscription,
  cancelProSubscription,
} from "@/features/billing/server/subscription";

export const billingRouter = router({
  startProSubscription: protectedProcedure.mutation(async ({ ctx }) => {
    return createProSubscription(ctx.session.user.id);
  }),

  cancelSubscription: protectedProcedure.mutation(async ({ ctx }) => {
    await cancelProSubscription(ctx.session.user.id);
    return { success: true };
  }),
});
