import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";

import { createTRPCRouter } from "@/trpc/init";
import { systemRouter } from "@/trpc/routers/system";

export const appRouter = createTRPCRouter({
  system: systemRouter,
});

export type AppRouter = typeof appRouter;
export type AppRouterInputs = inferRouterInputs<AppRouter>;
export type AppRouterOutputs = inferRouterOutputs<AppRouter>;
