import "server-only";

import { createClient } from "@supabase/supabase-js";

import { demoTrackingSnapshot } from "@/lib/demo";
import { getSupabaseConfig, isSupabaseConfigured } from "@/lib/supabase/config";
import { getLocationImageUrl } from "@/lib/supabase/location-images";
import type { PublicQueueOrder, TrackingSnapshot } from "@/lib/types";

type QueueRow = {
  order_id: string;
  location_id: string;
  public_number: string;
  status: "ordered" | "ready";
  created_at: string;
  ready_at: string | null;
};

export async function getTrackingSnapshot(token: string): Promise<TrackingSnapshot | null> {
  if (!isSupabaseConfigured()) return token === "demo" ? demoTrackingSnapshot : null;

  const { url, key } = getSupabaseConfig();
  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data, error } = await supabase.rpc("track_order", { p_tracking_token: token });
  if (error || !data) return null;

  const raw = data as Omit<TrackingSnapshot, "locationImageUrl" | "queue"> & {
    locationImagePath: string | null;
    queue: QueueRow[] | null;
  };
  const queue: PublicQueueOrder[] | null = raw.queue?.map((row) => ({
    orderId: row.order_id,
    locationId: row.location_id,
    publicNumber: row.public_number,
    status: row.status,
    createdAt: row.created_at,
    readyAt: row.ready_at,
  })) ?? null;

  const { locationImagePath, ...snapshot } = raw;
  return {
    ...snapshot,
    locationImageUrl: getLocationImageUrl(supabase, locationImagePath),
    queue,
  };
}
