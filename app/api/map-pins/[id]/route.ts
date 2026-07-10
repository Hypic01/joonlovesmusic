import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { storagePathFromPublicUrl } from "@/lib/memoryStorage";

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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await checkAdminAuth())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    const body = await request.json();
    const { song_id, place_name, lat, lng, google_place_id, country, city, place_category, note, photo_url, photo_thumb_url, taken_at } = body;

    if (
      typeof song_id !== "string" ||
      !song_id ||
      typeof place_name !== "string" ||
      !place_name.trim()
    ) {
      return NextResponse.json(
        { error: "song_id and a non-empty place_name are required" },
        { status: 400 }
      );
    }

    if (typeof lat !== "number" || Number.isNaN(lat) || lat < -90 || lat > 90) {
      return NextResponse.json(
        { error: "lat must be a number between -90 and 90" },
        { status: 400 }
      );
    }

    if (typeof lng !== "number" || Number.isNaN(lng) || lng < -180 || lng > 180) {
      return NextResponse.json(
        { error: "lng must be a number between -180 and 180" },
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

    const update = {
      song_id,
      place_name: place_name.trim(),
      lat,
      lng,
      google_place_id: google_place_id ?? null,
      country: country ?? null,
      city: city ?? null,
      place_category: place_category ?? null,
      note: note ?? null,
      photo_url: photo_url ?? null,
      photo_thumb_url: photo_thumb_url ?? null,
      taken_at: taken_at ?? null,
    };

    const supabase = getSupabaseAdmin();

    // Snapshot current photo URLs so a replace/remove can clean up storage.
    const { data: existing } = await supabase
      .from("map_pins")
      .select("photo_url, photo_thumb_url")
      .eq("id", id)
      .maybeSingle();

    const { data, error } = await supabase
      .from("map_pins")
      .update(update)
      .eq("id", id)
      .select()
      .maybeSingle();

    if (error) {
      console.error("Supabase update error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: "Pin not found" }, { status: 404 });
    }

    // Best-effort: remove storage objects the update just orphaned.
    const stale = [existing?.photo_url, existing?.photo_thumb_url]
      .filter((u): u is string => typeof u === "string" && !!u)
      .filter((u) => u !== update.photo_url && u !== update.photo_thumb_url);
    if (stale.length > 0) {
      const paths = stale
        .map(storagePathFromPublicUrl)
        .filter((p): p is string => !!p);
      if (paths.length > 0) {
        const { error: rmErr } = await supabase.storage.from("memories").remove(paths);
        if (rmErr) console.error("Storage cleanup error (patch):", rmErr);
      }
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error("API error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await checkAdminAuth())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    const supabase = getSupabaseAdmin();

    const { data: existing } = await supabase
      .from("map_pins")
      .select("photo_url, photo_thumb_url")
      .eq("id", id)
      .maybeSingle();

    const { error } = await supabase.from("map_pins").delete().eq("id", id);
    if (error) {
      console.error("Supabase delete error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Best-effort storage cleanup — a failure never blocks the delete.
    const urls = [existing?.photo_url, existing?.photo_thumb_url].filter(
      (u): u is string => typeof u === "string" && !!u
    );
    if (urls.length > 0) {
      const paths = urls.map(storagePathFromPublicUrl).filter((p): p is string => !!p);
      if (paths.length > 0) {
        const { error: rmErr } = await supabase.storage.from("memories").remove(paths);
        if (rmErr) console.error("Storage cleanup error (delete):", rmErr);
      }
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("API error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
