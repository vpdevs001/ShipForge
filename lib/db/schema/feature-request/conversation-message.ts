import { pgTable, text, timestamp, index } from "drizzle-orm/pg-core";
import { featureRequest } from "./feature-request";
import { conversationRoleEnum } from "../enums";

export const conversationMessage = pgTable(
  "conversation_message",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    featureRequestId: text("featureRequestId")
      .notNull()
      .references(() => featureRequest.id, { onDelete: "cascade" }),
    role: conversationRoleEnum("role").notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (t) => [index("idx_conv_message_fr").on(t.featureRequestId)]
);
