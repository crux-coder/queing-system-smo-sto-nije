import "server-only";

import { initTRPC } from "@trpc/server";

export function createTRPCContext(opts: { headers: Headers }) {
  return {
    headers: opts.headers,
  };
}

const t = initTRPC
  .context<Awaited<ReturnType<typeof createTRPCContext>>>()
  .create();

export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;
export const publicProcedure = t.procedure;
