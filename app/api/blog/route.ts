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

// GET all blog posts (public for published, all for admin)
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const isAdmin = await checkAdminAuth();
    const { searchParams } = new URL(request.url);
    const includeUnpublished = searchParams.get("all") === "true" && isAdmin;

    let query = supabase
      .from("blog_posts")
      .select("*")
      .order("created_at", { ascending: false });

    if (!includeUnpublished) {
      query = query.eq("published", true);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error("API error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// POST create new blog post (admin only)
export async function POST(request: NextRequest) {
  try {
    const isAdmin = await checkAdminAuth();
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { title, slug, content, preview, song_ids, published } = body;

    if (!title || !slug || !content) {
      return NextResponse.json(
        { error: "Title, slug, and content are required" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("blog_posts")
      .insert({
        title,
        slug,
        content,
        preview: preview || null,
        song_ids: song_ids || [],
        published: published || false,
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
    const errorMessage =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
