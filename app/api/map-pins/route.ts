import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Missing Supabase environment variables");
  }
  return createClient(supabaseUrl, supabaseServiceKey);
}

async function checkAdminAuth(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.get("admin-auth")?.value === "authenticated";
}

export async function POST(request: NextRequest) {
  try {
    if (!(await checkAdminAuth())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { song_id, place_name, lat, lng, google_place_id, country, city, place_category, note, photo_url, photo_thumb_url, taken_at } = body;

    if (
      typeof song_id !== "string" ||
      !song_id ||
      typeof place_name !== "string" ||
      !place_name.trim() ||
      typeof lat !== "number" ||
      Number.isNaN(lat) ||
      typeof lng !== "number" ||
      Number.isNaN(lng)
    ) {
      return NextResponse.json(
        { error: "song_id, place_name, lat, and lng are required" },
        { status: 400 }
      );
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return NextResponse.json(
        { error: "lat must be between -90 and 90 and lng between -180 and 180" },
        { status: 400 }
      );
    }

    const isOptionalString = (v: unknown): v is string | null | undefined =>
      v === undefined || v === null || typeof v === "string";
    // Local wall-clock moment; seconds optional (datetime-local sends none, Postgres returns them).
    const TAKEN_AT_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/;
    if (!isOptionalString(photo_url) || !isOptionalString(photo_thumb_url) || !isOptionalString(taken_at)) {
      return NextResponse.json(
        { error: "photo_url, photo_thumb_url, and taken_at must be strings when provided" },
        { status: 400 }
      );
    }
    if (typeof taken_at === "string" && taken_at && !TAKEN_AT_RE.test(taken_at)) {
      return NextResponse.json(
        { error: "taken_at must look like 2024-03-15T21:42" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("map_pins")
      .insert({
        song_id,
        place_name,
        lat,
        lng,
        google_place_id: google_place_id || null,
        country: country || null,
        city: city || null,
        place_category: place_category || null,
        note: note || null,
        photo_url: photo_url || null,
        photo_thumb_url: photo_thumb_url || null,
        taken_at: taken_at || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Supabase insert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ data });
  } catch (error) {
    console.error("API error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
