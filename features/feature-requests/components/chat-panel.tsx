"use client";

/**
 * ChatPanel — the clarification conversation between the user and the AI
 * agent for a feature request.
 *
 * Unlike a typical tRPC-only panel, sending a message here POSTs to the
 * streaming `/api/chat` route directly (not a tRPC mutation), because the
 * route both runs the AI agent and streams its reply token-by-token. The
 * route persists both the user's and the assistant's turns server-side;
 * this component re-syncs from `chat.getMessages` once the stream ends so
 * local state never drifts from the database.
 */

import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  ChatsIcon,
  PaperPlaneRightIcon,
  SpinnerIcon,
  CheckCircleIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";

type ChatPanelProps = {
  featureRequestId: string;
};

export function ChatPanel({ featureRequestId }: ChatPanelProps) {
  const trpc = useTRPC();
  const qc = useQueryClient();
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [streamingReply, setStreamingReply] = useState("");
  const [readyForPrd, setReadyForPrd] = useState(false);
  const [blockedReason, setBlockedReason] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const messagesQuery = useQuery(
    trpc.chat.getMessages.queryOptions({ featureRequestId })
  );

  const messagesQueryOptions = trpc.chat.getMessages.queryOptions({
    featureRequestId,
  });

  // Scroll to bottom whenever the message list or the in-flight stream grows.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messagesQuery.data, streamingReply]);

  async function handleSend() {
    const content = input.trim();
    if (!content || isSending) return;

    setInput("");
    setIsSending(true);
    setStreamingReply("");
    setBlockedReason(null);

    const history = (messagesQuery.data ?? []).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          featureRequestId,
          messages: [...history, { role: "user", content }],
        }),
      });

      if (res.status === 400) {
        const body = await res.json().catch(() => null);
        setBlockedReason(
          body?.reason ?? "That message couldn't be sent. Try rephrasing it."
        );
        return;
      }

      if (!res.ok || !res.body) {
        setBlockedReason("Something went wrong reaching the AI agent.");
        return;
      }

      setReadyForPrd(res.headers.get("x-ready-for-prd") === "true");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setStreamingReply(acc);
      }
    } finally {
      setIsSending(false);
      setStreamingReply("");
      // The route persisted both turns server-side — resync from the DB
      // rather than trusting local optimistic state.
      qc.invalidateQueries(messagesQueryOptions);
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      {/* Readiness indicator */}
      {readyForPrd && (
        <div className="flex items-center gap-2 rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-primary">
          <CheckCircleIcon className="size-4" />
          Enough detail gathered — head to the PRD tab to generate it.
        </div>
      )}

      {/* Message list */}
      <div className="flex-1 overflow-y-auto rounded-lg border border-border bg-card">
        {messagesQuery.isPending ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <SpinnerIcon className="size-5 animate-spin" />
          </div>
        ) : (messagesQuery.data?.length ?? 0) === 0 && !streamingReply ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <ChatsIcon className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No messages yet. Start the clarification conversation below.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3 p-4">
            {messagesQuery.data?.map((msg) => (
              <li
                key={msg.id}
                className={`flex flex-col gap-1 rounded-lg px-4 py-3 text-sm ${
                  msg.role === "user"
                    ? "ml-auto max-w-lg bg-primary/10 border border-primary/20 text-foreground"
                    : "mr-auto max-w-xl bg-muted/50 border border-border text-foreground"
                }`}
              >
                <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  {msg.role}
                </span>
                <p className="leading-relaxed whitespace-pre-wrap">
                  {msg.content}
                </p>
              </li>
            ))}

            {/* In-flight assistant reply, streamed token by token */}
            {streamingReply && (
              <li className="mr-auto flex max-w-xl flex-col gap-1 rounded-lg border border-border bg-muted/50 px-4 py-3 text-sm text-foreground">
                <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  assistant
                </span>
                <p className="leading-relaxed whitespace-pre-wrap">
                  {streamingReply}
                </p>
              </li>
            )}

            <div ref={bottomRef} />
          </ul>
        )}
      </div>

      {/* Blocked message warning */}
      {blockedReason && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          <WarningCircleIcon className="mt-0.5 size-4 shrink-0" />
          {blockedReason}
        </div>
      )}

      {/* Input bar */}
      <div className="flex gap-2">
        <Textarea
          placeholder="Reply to the AI agent…"
          rows={2}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          className="resize-none"
        />
        <Button
          onClick={handleSend}
          disabled={!input.trim() || isSending}
          className="self-end"
        >
          {isSending ? (
            <SpinnerIcon className="size-4 animate-spin" />
          ) : (
            <PaperPlaneRightIcon className="size-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
