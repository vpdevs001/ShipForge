import { z } from "zod";
import { router, protectedProcedure } from "@/trpc/init";
import { db } from "@/lib/db";
import { conversationMessage } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { assertCan } from "@/lib/rebac";

export const chatRouter = router({
  getMessages: protectedProcedure
    .input(z.object({ featureRequestId: z.string() }))
    .query(async ({ ctx, input }) => {
      await assertCan(
        ctx.session.user.id,
        "creator",
        "feature_request",
        input.featureRequestId
      );

      const messages = await db
        .select()
        .from(conversationMessage)
        .where(eq(conversationMessage.featureRequestId, input.featureRequestId))
        .orderBy(conversationMessage.createdAt);

      return messages;
    }),
});
