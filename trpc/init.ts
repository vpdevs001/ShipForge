import { initTRPC, TRPCError } from "@trpc/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import superjson from "superjson";
import { db } from "@/lib/db";

export const createContext = async (opts?: { req: Request }) => {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({
    headers: reqHeaders,
  });

  return {
    session,
    db,
    req: opts?.req,
  };
};

export type Context = Awaited<ReturnType<typeof createContext>>;

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape }) {
    return shape;
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;

const isAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.session || !ctx.session.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: {
      session: ctx.session,
    },
  });
});

export const protectedProcedure = t.procedure.use(isAuthed);
