"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [orgName, setOrgName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        await supabase.rpc("accept_pending_invites");
        router.push("/dashboard");
        router.refresh();
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        const userId = data.user?.id;

        if (!data.session) {
          // Supabase created the account but didn't hand back an active session — almost
          // always means "Confirm email" is still on in Supabase's Auth settings. Without a
          // session, none of the org/farm setup below can run (it needs to be authenticated),
          // so stop here with a specific, actionable message instead of failing a few lines
          // down on a confusing permission error.
          setError(
            'Account created, but no login session came back — this means "Confirm email" is ' +
            "still on in Supabase (Authentication → Email provider settings). Turn it off, " +
            "delete this email from Authentication → Users, and try Create account again."
          );
          return;
        }

        if (userId) {
          // If someone invited this email already, join that org instead of creating a new one.
          await supabase.rpc("accept_pending_invites");
          const { data: existingMembership } = await supabase
            .from("memberships")
            .select("id")
            .eq("user_id", userId)
            .maybeSingle();

          if (!existingMembership) {
            const slug = orgName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40) || `farm-${Date.now()}`;
            // Create the org + owner membership atomically via an RPC rather than two
            // separate client-side inserts — see 0006_create_org_rpc.sql for why: a plain
            // .insert().select() on organizations fails Row Level Security, because Postgres
            // checks the SELECT policy on the returned row too, and a brand-new org has no
            // membership linking its creator to it yet.
            const { data: newOrgId, error: orgErr } = await supabase.rpc("create_organization_with_owner", {
              org_name: orgName || "My Farm",
              org_slug: slug,
            });
            if (orgErr) throw orgErr;
            await supabase.rpc("seed_org_defaults", { target_org: newOrgId });
          }
        }
        router.push("/dashboard");
        router.refresh();
      }
    } catch (err) {
      // Supabase's Postgrest/Auth errors aren't always real Error instances — pull .message
      // off whatever shape they are so the real reason shows up instead of a generic fallback.
      const message =
        err instanceof Error
          ? err.message
          : err && typeof err === "object" && "message" in err
          ? String((err as { message: unknown }).message)
          : "Something went wrong";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-2xl font-extrabold text-brand-700 tracking-tight">Harvest OS</div>
          <p className="text-sm text-stone-500 mt-1">Farm operations, sales, and goals — in one place.</p>
        </div>

        <div className="card p-6">
          <div className="flex rounded-lg bg-stone-100 p-1 mb-6 text-sm font-medium">
            <button
              className={`flex-1 rounded-md py-1.5 transition-colors ${mode === "login" ? "bg-white shadow-sm text-brand-700" : "text-stone-500"}`}
              onClick={() => setMode("login")}
              type="button"
            >
              Log in
            </button>
            <button
              className={`flex-1 rounded-md py-1.5 transition-colors ${mode === "signup" ? "bg-white shadow-sm text-brand-700" : "text-stone-500"}`}
              onClick={() => setMode("signup")}
              type="button"
            >
              Create account
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div>
                <label className="label">Farm / company name</label>
                <input className="input" value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="Aiyahuta Craft Farm" required />
              </div>
            )}
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <label className="label">Password</label>
              <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button className="btn-primary w-full" type="submit" disabled={loading}>
              {loading ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-stone-400 mt-6">
          Been invited to a farm? Sign up (or log in) with the exact email you were invited on — you'll land in their farm automatically, with the role they set.
        </p>
      </div>
    </div>
  );
}
