import {
  QueryClient,
  defaultShouldDehydrateQuery,
} from "@tanstack/react-query";
import superjson from "superjson";

/**
 * Creates a QueryClient with sensible defaults for the tRPC + TanStack Query
 * integration. A fresh instance must be created per request on the server
 * (see `trpc-provider.tsx`), and a singleton is reused in the browser.
 */
export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30 * 1000,
      },
      dehydrate: {
        serializeData: superjson.serialize,
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) ||
          query.state.status === "pending",
      },
      hydrate: {
        deserializeData: superjson.deserialize,
      },
    },
  });
}
