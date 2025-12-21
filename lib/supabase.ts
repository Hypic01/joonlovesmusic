import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// Only log warning in development, don't throw error to prevent build failures
if ((!supabaseUrl || !supabaseAnonKey) && process.env.NODE_ENV === 'development') {
  console.warn("⚠️  Missing Supabase environment variables. Some features may not work.");
}

export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co", 
  supabaseAnonKey || "placeholder"
);

