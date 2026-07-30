"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { clearCachedOrgContext } from "@/lib/orgContextCache";

export default function SignOutButton() {
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    // Wipe the locally-cached org context (Phase 0 of the local-first rewrite) so the next person
    // to use this browser never gets even a flash of the previous farm's data before a fresh
    // server render lands.
    clearCachedOrgContext();
    router.push("/login");
    router.refresh();
  }

  return (
    <button className="btn-secondary" onClick={handleSignOut}>
      Sign out
    </button>
  );
}
