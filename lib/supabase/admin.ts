import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Service-role client — bypasses RLS entirely. Server-only (the `server-only` import makes any
// accidental client-bundle import a build error), and only ever used by routes that genuinely need
// to read/write across every org/user, like the push-notification cron below. Never expose
// SUPABASE_SERVICE_ROLE_KEY to the browser — it is deliberately NOT prefixed with NEXT_PUBLIC_.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
