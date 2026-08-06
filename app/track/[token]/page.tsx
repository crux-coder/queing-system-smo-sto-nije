import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getTrackingSnapshot } from "@/lib/data/tracking";
import { isSupabaseConfigured } from "@/lib/supabase/config";

import { TrackingClient } from "./tracking-client";

export const metadata: Metadata = { title: "Praćenje narudžbe" };
export const dynamic = "force-dynamic";

export default async function TrackingPage({ params }: PageProps<"/track/[token]">) {
  const { token } = await params;
  const snapshot = await getTrackingSnapshot(token);
  if (!snapshot) notFound();

  return <TrackingClient token={token} initialSnapshot={snapshot} demo={!isSupabaseConfigured()} />;
}
