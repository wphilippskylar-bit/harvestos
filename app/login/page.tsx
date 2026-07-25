"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { autoPinMarketReports } from "@/lib/market-autopin";

const OPERATION_TYPE_OPTIONS = [
  { key: "microgreens", label: "Microgreens (trays)" },
  { key: "field_crop", label: "Outdoor field crops" },
  { key: "cea", label: "Greenhouse, indoor, or hydroponic crops" },
  { key: "livestock", label: "Livestock / ranching" },
];

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [operationTypes, setOperationTypes] = useState<string[]>(["microgreens"]);
  const [autoPinMarket, setAutoPinMarket] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleOperationType(key: string) {
    setOperationTypes((prev) => {
      const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key];
      // Keep at least one selected — this drives which nav tabs/modules show up on day one.
      return next.length === 0 ? prev : next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/reset-password`,
        });
        if (error) throw error;
        // Don't reveal whether the email exists in the system either way — Supabase itself
        // returns success regardless (to avoid leaking which emails have accounts), and the UI
        // should match that rather than implying "if this fails, that email isn't registered."
        setForgotSent(true);
        return;
      }
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

            // seed_org_defaults leaves operation_types at its default (["microgreens"]) — set it
            // to whatever the signup questionnaire actually selected, so the right nav tabs/modules
            // show up immediately instead of everyone starting as a microgreens-only farm and
            // having to go find the toggle in Settings afterward.
            await supabase.from("organizations").update({ operation_types: operationTypes }).eq("id", newOrgId);

            // Best-effort: pin the USDA market reports relevant to what they picked. Doesn't block
            // account creation if it fails (e.g. market pricing isn't configured yet).
            if (autoPinMarket) {
              await autoPinMarketReports(supabase, newOrgId, operationTypes);
            }
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
          {mode !== "forgot" && (
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
          )}

          {mode === "forgot" && forgotSent ? (
            <div className="text-center space-y-3">
              <p className="text-sm text-stone-600">
                If an account exists for <span className="font-medium">{email}</span>, a password
                reset link is on its way — check your inbox (and spam folder).
              </p>
              <button
                type="button"
                className="text-sm text-brand-700 hover:underline"
                onClick={() => { setMode("login"); setForgotSent(false); }}
              >
                ← Back to log in
              </button>
            </div>
          ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "forgot" && (
              <p className="text-sm text-stone-500 -mt-1 mb-1">
                Enter the email on your account and we'll send a link to reset your password.
              </p>
            )}
            {mode !== "forgot" && mode === "signup" && (
              <div>
                <label className="label">Farm / company name</label>
                <input className="input" value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="Aiyahuta Craft Farm" required />
              </div>
            )}
            {mode !== "forgot" && mode === "signup" && (
              <div>
                <label className="label">What do you grow or raise?</label>
                <p className="text-xs text-stone-400 mb-2">Turns the matching tabs on — you can add or remove these anytime in Settings.</p>
                <div className="flex flex-wrap gap-2">
                  {OPERATION_TYPE_OPTIONS.map((opt) => {
                    const on = operationTypes.includes(opt.key);
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => toggleOperationType(opt.key)}
                        className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                          on ? "bg-brand-700 text-white border-brand-700" : "bg-white text-stone-500 border-stone-300"
                        }`}
                      >
                        {on ? "✓ " : ""}{opt.label}
                      </button>
                    );
                  })}
                </div>
                <label className="flex items-center gap-2 text-xs text-stone-500 mt-3">
                  <input type="checkbox" checked={autoPinMarket} onChange={(e) => setAutoPinMarket(e.target.checked)} />
                  Pin relevant USDA market price reports for me based on what I picked above
                </label>
              </div>
            )}
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            {mode !== "forgot" && (
              <div>
                <div className="flex items-center justify-between">
                  <label className="label">Password</label>
                  {mode === "login" && (
                    <button
                      type="button"
                      className="text-xs text-brand-700 hover:underline"
                      onClick={() => { setMode("forgot"); setError(null); }}
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    className="input pr-16"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={6}
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-stone-500 hover:text-stone-700"
                    onClick={() => setShowPassword((v) => !v)}
                    tabIndex={-1}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>
            )}
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button className="btn-primary w-full" type="submit" disabled={loading}>
              {loading
                ? "Please wait…"
                : mode === "login"
                ? "Log in"
                : mode === "forgot"
                ? "Send reset link"
                : "Create account"}
            </button>
          </form>
          )}
        </div>

        <p className="text-center text-xs text-stone-400 mt-6">
          Been invited to a farm? Sign up (or log in) with the exact email you were invited on — you'll land in their farm automatically, with the role they set.
        </p>
        <p className="text-center text-xs text-stone-400 mt-3">
          By continuing, you agree to the <Link href="/terms" className="text-brand-700 hover:underline">Terms of Use</Link> and{" "}
          <Link href="/privacy" className="text-brand-700 hover:underline">Privacy Policy</Link>.
        </p>
      </div>
    </div>
  );
}
