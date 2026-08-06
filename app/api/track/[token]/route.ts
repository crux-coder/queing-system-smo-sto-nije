import { NextResponse } from "next/server";
import { z } from "zod";

import { getTrackingSnapshot } from "@/lib/data/tracking";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function GET(_request: Request, context: RouteContext<"/api/track/[token]">) {
  const { token } = await context.params;
  const validDemo = !isSupabaseConfigured() && token === "demo";
  if (!validDemo && !z.uuid().safeParse(token).success) {
    return NextResponse.json({ error: "Narudžba nije pronađena." }, { status: 404 });
  }

  const snapshot = await getTrackingSnapshot(token);
  if (!snapshot) return NextResponse.json({ error: "Narudžba nije pronađena." }, { status: 404 });
  return NextResponse.json(snapshot, {
    headers: { "Cache-Control": "no-store" },
  });
}
