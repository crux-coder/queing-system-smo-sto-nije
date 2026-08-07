import { NextResponse } from "next/server";

import {
  getLocationImageUrl,
  isLocationImageType,
  LOCATION_IMAGE_MAX_BYTES,
  LOCATION_IMAGES_BUCKET,
} from "@/lib/supabase/location-images";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const EXTENSIONS = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > LOCATION_IMAGE_MAX_BYTES + 64 * 1024) {
    return NextResponse.json({ error: "Slika može imati najviše 2 MB." }, { status: 413 });
  }

  const supabase = await createServerSupabaseClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return NextResponse.json({ error: "Prijava je istekla." }, { status: 401 });
  }

  const formData = await request.formData();
  const image = formData.get("image");
  if (!(image instanceof File) || !isLocationImageType(image.type)) {
    return NextResponse.json({ error: "Odaberite JPG, PNG ili WebP sliku." }, { status: 400 });
  }
  if (image.size === 0) {
    return NextResponse.json({ error: "Odabrana slika je prazna." }, { status: 400 });
  }
  if (image.size > LOCATION_IMAGE_MAX_BYTES) {
    return NextResponse.json({ error: "Slika može imati najviše 2 MB." }, { status: 413 });
  }

  const { data: location, error: locationError } = await supabase
    .from("locations")
    .select("id, image_path")
    .eq("owner_user_id", authData.user.id)
    .single();
  if (locationError || !location) {
    return NextResponse.json({ error: "Lokacija nije pronađena." }, { status: 404 });
  }

  const imagePath = `${location.id}/${crypto.randomUUID()}.${EXTENSIONS[image.type]}`;
  const storage = supabase.storage.from(LOCATION_IMAGES_BUCKET);
  const { error: uploadError } = await storage.upload(imagePath, image, {
    cacheControl: "31536000",
    contentType: image.type,
    upsert: false,
  });
  if (uploadError) {
    return NextResponse.json({ error: "Sliku trenutno nije moguće učitati." }, { status: 500 });
  }

  const { error: updateError } = await supabase.rpc("set_location_image", { p_image_path: imagePath });
  if (updateError) {
    await storage.remove([imagePath]);
    return NextResponse.json({ error: "Sliku trenutno nije moguće sačuvati." }, { status: 500 });
  }

  if (location.image_path) await storage.remove([location.image_path]);

  return NextResponse.json(
    { imageUrl: getLocationImageUrl(supabase, imagePath) },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
