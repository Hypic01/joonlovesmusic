import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

// Renditions arrive pre-compressed from the client (≤1600px / 320px JPEGs),
// so these caps only guard against abuse — normal uploads are far smaller.
const MAX_MAIN_BYTES = 8 * 1024 * 1024;
const MAX_THUMB_BYTES = 2 * 1024 * 1024;

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
    const form = await request.formData();
    const main = form.get("main");
    const thumb = form.get("thumb");
    if (!(main instanceof Blob) || !(thumb instanceof Blob)) {
      return NextResponse.json({ error: "main and thumb image files are required" }, { status: 400 });
    }
    if (main.size === 0 || thumb.size === 0 || main.size > MAX_MAIN_BYTES || thumb.size > MAX_THUMB_BYTES) {
      return NextResponse.json({ error: "Image is empty or too large" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const id = crypto.randomUUID();
    const mainPath = `${id}.jpg`;
    const thumbPath = `${id}_thumb.jpg`;
    const uploadOpts = { contentType: "image/jpeg", cacheControl: "31536000", upsert: false };

    const { error: mainErr } = await supabase.storage.from("memories").upload(mainPath, main, uploadOpts);
    if (mainErr) {
      console.error("Storage upload error (main):", mainErr);
      return NextResponse.json({ error: "Photo upload failed — try again" }, { status: 500 });
    }
    const { error: thumbErr } = await supabase.storage.from("memories").upload(thumbPath, thumb, uploadOpts);
    if (thumbErr) {
      console.error("Storage upload error (thumb):", thumbErr);
      // Don't leave a half-uploaded pair behind.
      await supabase.storage.from("memories").remove([mainPath]);
      return NextResponse.json({ error: "Photo upload failed — try again" }, { status: 500 });
    }

    const photo_url = supabase.storage.from("memories").getPublicUrl(mainPath).data.publicUrl;
    const photo_thumb_url = supabase.storage.from("memories").getPublicUrl(thumbPath).data.publicUrl;
    return NextResponse.json({ photo_url, photo_thumb_url });
  } catch (error) {
    console.error("API error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
