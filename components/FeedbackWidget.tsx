"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { DEMO_MODE } from "@/lib/demo-mode";

const CATEGORIES = [
  { key: "bug", label: "Something's broken" },
  { key: "idea", label: "Idea / request" },
  { key: "general", label: "General feedback" },
];

// Mounted globally in app/(app)/layout.tsx — a low-friction way for beta testers to flag a
// problem or idea without leaving the page or hunting for an email address. Deliberately minimal:
// one floating button, a small form, done. Feedback lands in the `feedback` table (migration
// 0028) and is only readable by platform admins — see the Feedback tab on /admin.
export default function FeedbackWidget({
  orgId, userId, userEmail,
}: { orgId?: string; userId?: string | null; userEmail?: string | null }) {
  const supabase = createClient();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("general");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    setSending(true);
    setError(null);
    try {
      if (DEMO_MODE) { setSent(true); return; }
      const { error } = await supabase.from("feedback").insert({
        org_id: orgId || null,
        user_id: userId || null,
        user_email: userEmail || null,
        page_path: pathname,
        category,
        message: message.trim(),
      });
      if (error) throw error;
      setSent(true);
      setMessage("");
    } catch {
      setError("Couldn't send that — try again in a moment.");
    } finally {
      setSending(false);
    }
  }

  function close() {
    setOpen(false);
    // Reset after the close animation would run, if there were one — immediate is fine here.
    setTimeout(() => { setSent(false); setError(null); setCategory("general"); }, 200);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-50 rounded-full bg-brand-700 text-white shadow-lg px-4 py-2.5 text-sm font-medium hover:bg-brand-800 transition-colors print:hidden"
        aria-label="Send feedback"
      >
        Feedback
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:justify-end p-0 sm:p-6 print:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={close} />
          <div className="relative card w-full sm:w-96 p-5 rounded-b-none sm:rounded-lg">
            {sent ? (
              <div className="text-center py-4 space-y-3">
                <p className="text-sm text-emerald-700 font-medium">Thanks — got it.</p>
                <button className="btn-secondary !py-1.5 text-sm" onClick={close}>Close</button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-stone-800">Send feedback</h3>
                  <button type="button" className="text-stone-400 hover:text-stone-600 text-sm" onClick={close}>✕</button>
                </div>
                <div className="flex gap-1.5">
                  {CATEGORIES.map((c) => (
                    <button
                      key={c.key}
                      type="button"
                      onClick={() => setCategory(c.key)}
                      className={`text-xs font-medium px-2.5 py-1 rounded-full border transition-colors ${
                        category === c.key ? "bg-brand-700 text-white border-brand-700" : "bg-white text-stone-500 border-stone-300"
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
                <textarea
                  className="input"
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="What's up? Be as specific as you can — what page you're on and what you expected vs. what happened, for bugs."
                  required
                  autoFocus
                />
                {error && <p className="text-xs text-red-600">{error}</p>}
                <button className="btn-primary w-full" type="submit" disabled={sending || !message.trim()}>
                  {sending ? "Sending…" : "Send"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
