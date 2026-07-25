"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { errorMessage } from "@/lib/errors";

// Landing page for the link in a "reset your password" email. Supabase's browser client
// (createBrowserClient from @supabase/ssr) automatically detects the recovery token in the URL
// and exchanges it for a real session on load — by the time this component's effects run, the
// person is authenticated (in a password-recovery-scoped session) without us having to parse
// anything from the URL ourselves. From there it's just an ordinary "set a new password" form.

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Give the browser client a moment to finish exchanging the URL's recovery token for a
    // session before checking — it happens automatically, but isn't guaranteed to be done the
    // instant this component mounts.
    supabase.auth.getSession().then(({ data }) => {
      setHasSession(!!data.session);
      setChecking(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setHasSession(true);
    });
    return () => listener.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setDone(true);
      setTimeout(() => {
        router.push("/dashboard");
        router.refresh();
      }, 1500);
    } catch (err) {
      setError(errorMessage(err, "Could not update password"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-2xl font-extrabold text-brand-700 tracking-tight">Harvest OS</div>
          <p className="text-sm text-stone-500 mt-1">Set a new password</p>
        </div>

        <div className="card p-6">
          {checking ? (
            <p className="text-sm text-stone-400 text-center">Checking your reset link…</p>
          ) : !hasSession ? (
            <div className="text-center space-y-3">
              <p className="text-sm text-red-600">
                This reset link is invalid or has expired. Password reset links only work once and
                expire after a while for security.
              </p>
              <a href="/login" className="text-sm text-brand-700 hover:underline">Request a new one from the login page</a>
            </div>
          ) : done ? (
            <p className="text-sm text-emerald-700 text-center">Password updated — taking you to your dashboard…</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <label className="label">New password</label>
                  <button
                    type="button"
                    className="text-xs text-stone-500 hover:text-stone-700"
                    onClick={() => setShowPassword((v) => !v)}
                    tabIndex={-1}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
                <input className="input" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required autoFocus />
              </div>
              <div>
                <label className="label">Confirm new password</label>
                <input className="input" type={showPassword ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} minLength={6} required />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button className="btn-primary w-full" type="submit" disabled={saving}>
                {saving ? "Saving…" : "Set new password"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
