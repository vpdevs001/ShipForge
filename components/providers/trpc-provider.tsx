"use client";

import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { useState } from "react";
import superjson from "superjson";
import { TRPCProvider as TRPCContextProvider } from "@/trpc/client";
import { makeQueryClient } from "@/trpc/query-client";
import type { AppRouter } from "@/trpc/router";

let browserQueryClient: QueryClient | undefined;

/**
 * Returns the QueryClient to use for this render.
 *
 * On the server a fresh client is created per request (so users never
 * share a cache). In the browser a singleton is reused across renders so
 * the cache survives client-side navigation.
 */
function getQueryClient() {
  if (typeof window === "undefined") {
    return makeQueryClient();
  }
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient();
  }
  return browserQueryClient;
}

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();
  const [trpcClient] = useState(() =>
    createTRPCClient<AppRouter>({
      links: [
        httpBatchLink({
          url: "/api/trpc",
          transformer: superjson,
        }),
      ],
    })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <TRPCContextProvider trpcClient={trpcClient} queryClient={queryClient}>
        {children}
      </TRPCContextProvider>
    </QueryClientProvider>
  );
}
