import { NextResponse } from "next/server";
import { z } from "zod";

import { normalizeDescription } from "@/lib/domain/orders";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const createOrderSchema = z.object({
  description: z.string(),
  idempotencyKey: z.uuid(),
});

export async function POST(request: Request) {
  const result = createOrderSchema.safeParse(await request.json());
  if (!result.success) {
    return NextResponse.json({ error: "Podaci narudžbe nisu ispravni." }, { status: 400 });
  }

  let description: string;
  try {
    description = normalizeDescription(result.data.description);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Narudžba nije ispravna." },
      { status: 400 },
    );
  }

  const supabase = await createServerSupabaseClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return NextResponse.json({ error: "Prijava je istekla." }, { status: 401 });

  const { data, error } = await supabase.rpc("create_order", {
    p_description: description,
    p_idempotency_key: result.data.idempotencyKey,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 409 });
  const created = data?.[0];
  return NextResponse.json({
    id: created.order_id,
    publicNumber: created.order_public_number,
    trackingToken: created.order_tracking_token,
    status: created.order_status,
    createdAt: created.order_created_at,
  });
}
