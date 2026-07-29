// Shared "this was saved locally" confirmation, shown in place of a form once
// lib/useOfflineSubmit.ts's `queued` flips true. `children` is for a form-specific caveat (e.g.
// HarvestForm's "the photo wasn't attached" note) — most forms won't need it.
export default function OfflineQueuedPanel({ children }: { children?: React.ReactNode }) {
  return (
    <div className="card p-4 mt-2 space-y-1">
      <p className="text-sm text-emerald-700 font-medium">Saved locally — will upload when you're back online.</p>
      {children}
    </div>
  );
}
