import { NextRequest } from "next/server";
import { createTextStreamResponse } from "ai";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { conversationMessage, featureRequest } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { assertCan } from "@/lib/rebac";
import { runChatAgent } from "@/features/chat/server/chat-agent";

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { messages, featureRequestId } = await req.json();

  if (!featureRequestId) {
    return new Response("Missing featureRequestId", { status: 400 });
  }

  // 1. ReBAC Check
  await assertCan(
    session.user.id,
    "creator",
    "feature_request",
    featureRequestId
  );

  // 2. Fetch the original Feature Request to get rawInput and workspaceId
  const [fr] = await db
    .select()
    .from(featureRequest)
    .where(eq(featureRequest.id, featureRequestId))
    .limit(1);

  if (!fr) {
    return new Response("Feature request not found", { status: 404 });
  }

  const latestUserMessage = messages[messages.length - 1];

  // 3. Save User Message
  await db.insert(conversationMessage).values({
    featureRequestId,
    role: "user",
    content: latestUserMessage.content,
  });

  // 4. Run Chat Agent
  const result = await runChatAgent({
    featureRequestId,
    messages: messages.map(
      (m: { role: "user" | "assistant"; content: string }) => ({
        role: m.role,
        content: m.content,
      })
    ),
    rawInput: fr.rawInput,
  });

  if (result.blocked) {
    await db.insert(conversationMessage).values({
      featureRequestId,
      role: "assistant",
      content: result.reason!,
    });
    return new Response(
      JSON.stringify({ blocked: true, reason: result.reason }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  if (result.readyForPrd && fr.status !== "clarifying") {
    await db
      .update(featureRequest)
      .set({ status: "clarifying" })
      .where(eq(featureRequest.id, featureRequestId));
  }

  // 5. Return stream and log usage on completion
  return createTextStreamResponse({
    stream: result.stream!.textStream,
    headers: {
      "x-ready-for-prd": result.readyForPrd ? "true" : "false",
    },
  });
}
