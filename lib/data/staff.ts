import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { StaffSnapshot } from "@/lib/types";

export async function getStaffSnapshot(): Promise<StaffSnapshot | null> {
  const supabase = await createServerSupabaseClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError || !authData.user) return null;

  const { data: location, error: locationError } = await supabase
    .from("locations")
    .select("id, display_name")
    .eq("owner_user_id", authData.user.id)
    .single();

  if (locationError) throw locationError;

  const { data: orders, error: ordersError } = await supabase
    .from("orders")
    .select(
      "id, public_number, description, status, tracking_token, created_at, ready_at",
    )
    .in("status", ["ordered", "ready"])
    .eq("location_id", location.id)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });

  if (ordersError) throw ordersError;

  return {
    locationId: location.id,
    locationName: location.display_name,
    orders: (orders ?? []).map((order) => ({
      id: order.id,
      publicNumber: order.public_number,
      description: order.description,
      status: order.status,
      trackingToken: order.tracking_token,
      createdAt: order.created_at,
      readyAt: order.ready_at,
    })),
  };
}
