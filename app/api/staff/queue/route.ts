import { NextResponse } from "next/server";

import { getStaffSnapshot } from "@/lib/data/staff";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Backend nije konfigurisan." }, { status: 503 });
  }

  const snapshot = await getStaffSnapshot();
  if (!snapshot) return NextResponse.json({ error: "Prijava je istekla." }, { status: 401 });

  return NextResponse.json(snapshot, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
