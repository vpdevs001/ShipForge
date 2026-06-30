import { createTRPCContext } from "@trpc/tanstack-react-query";
import type { AppRouter } from "./router";

/**
 * Type-safe tRPC context for the TanStack React Query integration.
 *
 * `useTRPC()` returns a proxy with `.queryOptions()` / `.mutationOptions()`
 * on every procedure, designed to be passed straight into `useQuery` /
 * `useMutation` from `@tanstack/react-query`.
 */
export const { TRPCProvider, useTRPC, useTRPCClient } =
  createTRPCContext<AppRouter>();
