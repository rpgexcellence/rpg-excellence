import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  console.log(
    "Supabase admin key type:",
    process.env.SUPABASE_SERVICE_ROLE_KEY?.startsWith("sb_secret_")
      ? "SECRET"
      : "NOT_SECRET"
  );

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    }
  );
}
