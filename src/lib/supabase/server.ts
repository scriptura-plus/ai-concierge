import { createClient } from "@supabase/supabase-js";

export function getSupabaseServerClient() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!url) {
    throw new Error("SUPABASE_URL is missing.");
  }

  if (!serviceKey) {
    throw new Error("SUPABASE_SERVICE_KEY is missing.");
  }

  return createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
