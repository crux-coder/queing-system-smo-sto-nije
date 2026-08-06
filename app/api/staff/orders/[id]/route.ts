import { NextResponse } from "next/server";
import { z } from "zod";

import { normalizeDescription } from "@/lib/domain/orders";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const statusSchema = z.enum(["ordered", "ready", "collected", "cancelled", "expired"]);
const updateSchema = z.object({
  expectedStatus: statusSchema,
  nextStatus: statusSchema,
  description: z.string().nullable().optional(),
});

export async function PATCH(request: Request, context: RouteContext<"/api/staff/orders/[id]">) {
  const { id } = await context.params;
  const parsedId = z.uuid().safeParse(id);
  const parsed = updateSchema.safeParse(await request.json());
  if (!parsedId.success || !parsed.success) {
    return NextResponse.json({ error: "Zahtjev nije ispravan." }, { status: 400 });
  }

  let description = parsed.data.description ?? null;
  if (description !== null) {
    try {
      description = normalizeDescription(description);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Narudžba nije ispravna." },
        { status: 400 },
      );
    }
  }

  const supabase = await createServerSupabaseClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return NextResponse.json({ error: "Prijava je istekla." }, { status: 401 });

  const { data, error } = await supabase.rpc("update_order", {
    p_order_id: parsedId.data,
    p_expected_status: parsed.data.expectedStatus,
    p_next_status: parsed.data.nextStatus,
    p_description: description,
  });

  if (error) {
    console.error("update_order failed", error);
    return NextResponse.json(
      { error: "Narudžba je promijenjena ili nije dostupna. Osvježite red i pokušajte ponovo." },
      { status: 409 },
    );
  }
  return NextResponse.json(data?.[0]);
}
