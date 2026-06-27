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
    const { song_id, place_name, lat, lng, google_place_id, country, city, place_category, note } = body;

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
    };

    const supabase = getSupabaseAdmin();
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
    const { error } = await supabase.from("map_pins").delete().eq("id", id);
    if (error) {
      console.error("Supabase delete error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("API error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
