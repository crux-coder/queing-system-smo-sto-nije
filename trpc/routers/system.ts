import { createTRPCRouter, publicProcedure } from "@/trpc/init";

export const systemRouter = createTRPCRouter({
  health: publicProcedure.query(() => ({
    status: "ok" as const,
    checkedAt: new Date().toISOString(),
  })),
});
