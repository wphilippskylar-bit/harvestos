"use client";

import { createClient } from "@/lib/supabase/client";
import { syncOne, type SyncTable } from "@/lib/syncEngine";

// Phase 4 of the local-first rewrite (see HarvestOS_Local_First_Rewrite_Plan.md). The sync engine
// (lib/syncEngine.ts) already keeps Dexie warm on a 5-minute timer — good enough for "don't go too
// stale," but not for "I just changed something on my phone, why doesn't my laptop show it yet."
// This subscribes to Supabase Realtime for every table the sync engine knows how to pull, and on
// any change, re-pulls just that one table (via syncOne, not a full syncPull) so a change from
// another device — or another browser tab — shows up in Dexie, and therefore on screen via
// useLiveCachedTable, within a second or two instead of waiting for the timer or a manual refresh.
//
// Deliberately re-pulls the whole table rather than hand-applying the specific insert/update/
// delete payload Realtime hands back: several of these pulls involve joins or merges (animals +
// animal_status) that are much simpler to get right by asking Supabase for the current truth again
// than by trying to patch a partial Realtime payload into an already-joined shape client-side.
//
// REQUIRES Realtime to actually be enabled for these tables in the Supabase dashboard (Database →
// Replication → toggle each table on, or `ALTER PUBLICATION supabase_realtime ADD TABLE <name>`).
// This is a one-time backend setup step, not something this code can do — if it's not done, nothing
// breaks, this subscription just never receives anything and the app quietly falls back to the
// existing 5-minute sync timer, same as before this phase.
// crop_inventory and monthly_pnl are deliberately NOT in this list — both are Postgres views
// (derived from other tables, not written to directly), and Realtime's postgres_changes only fires
// on actual table writes (it works off logical replication of the underlying tables, which a view
// doesn't have). Subscribing to a view here would silently never fire. They still refresh via the
// 5-minute sync timer, and indirectly whenever a table they're derived from changes and gets
// re-pulled (e.g. a purchase changing crop_inventory's totals also triggers a purchases re-pull).
const REALTIME_TABLES: SyncTable[] = [
  "batches", "animals", "grazing_events", "environmental_logs", "fields",
  "purchases", "sales", "sales_channels", "crops", "goals", "market_watchlist", "sops",
  "schedule_events", "labor_entries", "cea_areas", "cea_facilities",
];

// animal_status changes (a separate table, merged into `animals` at read time — see
// pullAnimals in syncEngine.ts) need to trigger the same "animals" re-pull, not their own table.
const ALSO_WATCH: { table: string; repull: SyncTable }[] = [
  { table: "animal_status", repull: "animals" },
];

export function startRealtimeSync(orgId: string): () => void {
  if (!orgId) return () => {};
  const supabase = createClient();
  const timers = new Map<string, ReturnType<typeof setTimeout>>();

  function scheduleRepull(table: SyncTable) {
    // Debounced per table — a burst of changes (e.g. a bulk import, or several fields in one row
    // update firing separately) collapses into one re-pull shortly after the burst quiets down,
    // instead of one network round trip per row changed.
    const existing = timers.get(table);
    if (existing) clearTimeout(existing);
    timers.set(
      table,
      setTimeout(() => {
        syncOne(table, orgId).catch(() => {});
      }, 600)
    );
  }

  const channel = supabase.channel(`sync:${orgId}`);

  for (const table of REALTIME_TABLES) {
    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table, filter: `org_id=eq.${orgId}` },
      () => scheduleRepull(table)
    );
  }
  for (const { table, repull } of ALSO_WATCH) {
    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table, filter: `org_id=eq.${orgId}` },
      () => scheduleRepull(repull)
    );
  }

  channel.subscribe();

  return () => {
    timers.forEach((t) => clearTimeout(t));
    supabase.removeChannel(channel);
  };
}
