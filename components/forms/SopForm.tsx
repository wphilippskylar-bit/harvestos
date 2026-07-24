"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { DEMO_MODE } from "@/lib/demo-mode";
import { errorMessage } from "@/lib/errors";

type Sop = { id: string; title: string; category: string | null; content: string };

export default function SopForm({ orgId, sop, onDone }: { orgId: string; sop?: Sop; onDone: () => void }) {
  const supabase = createClient();
  const router = useRouter();
  const isEdit = !!sop;
  const [title, setTitle] = useState(sop?.title ?? "");
  const [category, setCategory] = useState(sop?.category ?? "");
  const [content, setContent] = useState(sop?.content ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (DEMO_MODE) { onDone(); return; }
      const payload = { title, category: category || null, content, updated_at: new Date().toISOString() };
      if (isEdit && sop) {
        const { error } = await supabase.from("sops").update(payload).eq("id", sop.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("sops").insert({ org_id: orgId, ...payload });
        if (error) throw error;
      }
      onDone();
      router.refresh();
    } catch (err) {
      setError(errorMessage(err, "Could not save SOP"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card p-5 mb-4 space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Title</label>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Tray sanitizing procedure" required />
        </div>
        <div>
          <label className="label">Category (optional)</label>
          <input className="input" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Sanitation, Harvest, Onboarding" />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Procedure</label>
          <textarea className="input" rows={10} value={content} onChange={(e) => setContent(e.target.value)} placeholder="Write the steps out — plain text or a numbered list works fine." required />
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2 justify-end">
        <button type="button" className="btn-secondary" onClick={onDone}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={saving}>{saving ? "Saving…" : isEdit ? "Save changes" : "Add SOP"}</button>
      </div>
    </form>
  );
}
