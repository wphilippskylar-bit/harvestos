"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { DEMO_MODE } from "@/lib/demo-mode";
import { EmptyState } from "@/components/ui";
import SopForm from "@/components/forms/SopForm";

type Sop = { id: string; title: string; category: string | null; content: string; updated_at: string };

export default function SopsClient({ orgId, role, sops }: { orgId: string; role: string; sops: Sop[] }) {
  const supabase = createClient();
  const router = useRouter();
  const isEditor = role === "owner" || role === "admin" || role === "member";
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const categories = ["all", ...Array.from(new Set(sops.map((s) => s.category).filter(Boolean) as string[]))];
  const filtered = categoryFilter === "all" ? sops : sops.filter((s) => s.category === categoryFilter);

  async function deleteSop(id: string, title: string) {
    if (DEMO_MODE) return;
    if (!window.confirm(`Delete "${title}"? This can't be undone.`)) return;
    await supabase.from("sops").delete().eq("id", id);
    router.refresh();
  }

  if (sops.length === 0 && !showForm) {
    return (
      <div className="space-y-4">
        <EmptyState
          title="No SOPs yet"
          hint="Write down how you do things — sanitizing, harvest steps, onboarding a new hire — so it's not just in your head."
        />
        {isEditor && (
          <div className="flex justify-center">
            <button className="btn-primary" onClick={() => setShowForm(true)}>Add your first SOP</button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {isEditor && (
        showForm
          ? <SopForm orgId={orgId} onDone={() => setShowForm(false)} />
          : <div className="flex justify-end"><button className="btn-primary" onClick={() => setShowForm(true)}>+ Add SOP</button></div>
      )}

      {categories.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <button
              key={c}
              className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors capitalize ${
                categoryFilter === c ? "bg-brand-700 text-white border-brand-700" : "bg-white text-stone-500 border-stone-300"
              }`}
              onClick={() => setCategoryFilter(c)}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {filtered.map((s) => {
        const expanded = expandedId === s.id;
        const editing = editingId === s.id;
        return (
          <div key={s.id} className="card overflow-hidden">
            {editing ? (
              <div className="px-5 py-4">
                <SopForm orgId={orgId} sop={s} onDone={() => setEditingId(null)} />
              </div>
            ) : (
              <>
                <button
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-stone-50"
                  onClick={() => setExpandedId(expanded ? null : s.id)}
                >
                  <div>
                    <div className="font-semibold text-stone-800 flex items-center gap-2">
                      {s.title}
                      {s.category && <span className="badge bg-stone-100 text-stone-600">{s.category}</span>}
                    </div>
                  </div>
                  <span className="text-stone-400 text-sm">{expanded ? "Hide" : "View"}</span>
                </button>
                {expanded && (
                  <div className="border-t border-stone-100 px-5 py-4 space-y-3">
                    <p className="text-sm text-stone-700 whitespace-pre-wrap">{s.content}</p>
                    {isEditor && (
                      <div className="flex gap-3">
                        <button className="text-xs font-medium text-brand-700 hover:underline" onClick={() => setEditingId(s.id)}>Edit</button>
                        <button className="text-xs font-medium text-red-600 hover:underline" onClick={() => deleteSop(s.id, s.title)}>Delete</button>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
