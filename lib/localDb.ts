// Phase 1 of the local-first / offline plan (see project doc
// "HarvestOS_Offline_LocalFirst_Plan.md"). This is a browser-side database (IndexedDB, via Dexie)
// that mirrors the handful of tables that matter for field use. It exists alongside — not instead
// of — the server-rendered pages and the service-worker page caching already in place:
//
//   - The service worker (public/sw.js) caches whole rendered pages, so a page you've visited
//     before still shows *something* when offline. That's coarse-grained: the whole page, as it
//     looked last time.
//   - This local database is fine-grained: individual records (a batch, an animal, a field),
//     cached the moment a page successfully loads them, readable independently of which page
//     fetched them. That's what lets a later feature — an offline-aware form, a cross-page lookup,
//     a generalized write queue (Phase 3 of the plan) — get at "the batches I know about" without
//     needing the Batches page itself to have been the thing that loaded them.
//
// This file only defines the schema and the read-through helpers. Wiring individual pages to
// actually populate and read from it happens incrementally (Phase 2) — see LivestockClient /
// BatchesClient for the first ones connected.

import Dexie, { type Table } from "dexie";

// Every cached row keeps its original shape from Supabase (whatever columns that table's
// lib/data.ts query selected) plus these two, which the cache itself needs.
type Cached<T> = T & { org_id: string; _cachedAt: number };

export type CachedBatch = Cached<Record<string, any>>;
export type CachedAnimal = Cached<Record<string, any>>;
export type CachedHealthLog = Cached<Record<string, any>>;
export type CachedGrazingEvent = Cached<Record<string, any>>;
export type CachedEnvLog = Cached<Record<string, any>>;
export type CachedField = Cached<Record<string, any>>;
export type CachedPurchase = Cached<Record<string, any>>;
export type CachedSale = Cached<Record<string, any>>;
export type CachedSalesChannel = Cached<Record<string, any>>;
export type CachedCrop = Cached<Record<string, any>>;
export type CachedGoal = Cached<Record<string, any>>;
export type CachedCropInventory = Cached<Record<string, any>>;
export type CachedMarketWatchlist = Cached<Record<string, any>>;
export type CachedMonthlyPnl = Cached<Record<string, any>>;

class HarvestLocalDB extends Dexie {
  batches!: Table<CachedBatch, string>;
  animals!: Table<CachedAnimal, string>;
  animal_health_logs!: Table<CachedHealthLog, string>;
  grazing_events!: Table<CachedGrazingEvent, string>;
  environmental_logs!: Table<CachedEnvLog, string>;
  fields!: Table<CachedField, string>;
  purchases!: Table<CachedPurchase, string>;
  sales!: Table<CachedSale, string>;
  sales_channels!: Table<CachedSalesChannel, string>;
  crops!: Table<CachedCrop, string>;
  goals!: Table<CachedGoal, string>;
  crop_inventory!: Table<CachedCropInventory, string>;
  market_watchlist!: Table<CachedMarketWatchlist, string>;
  monthly_pnl!: Table<CachedMonthlyPnl, string>;

  constructor() {
    super("harvestos-local");
    this.version(1).stores({
      // Primary key first, then indexed fields — id is the Supabase row id in every case, org_id
      // is what every read-through query filters on (this app is multi-tenant even though a given
      // device is normally only ever signed into one org at a time).
      batches: "id, org_id, status",
      animals: "id, org_id, status",
      animal_health_logs: "id, org_id, animal_id",
      grazing_events: "id, org_id, field_id",
      environmental_logs: "id, org_id, batch_id",
      fields: "id, org_id",
    });
    // Version 2: added for the Dashboard local-first conversion — the Dashboard aggregates several
    // more tables than any other page. Dexie requires additive versioning like this (a new
    // .version().stores() call covering the full schema going forward) rather than editing
    // version(1) in place, so existing users' IndexedDB upgrades cleanly instead of losing data.
    this.version(2).stores({
      batches: "id, org_id, status",
      animals: "id, org_id, status",
      animal_health_logs: "id, org_id, animal_id",
      grazing_events: "id, org_id, field_id",
      environmental_logs: "id, org_id, batch_id",
      fields: "id, org_id",
      purchases: "id, org_id",
      sales: "id, org_id",
      sales_channels: "id, org_id",
      crops: "id, org_id",
      goals: "id, org_id",
      crop_inventory: "id, org_id",
      market_watchlist: "id, org_id",
      // monthly_pnl rows come from a Postgres view, not a real table — it may not have a stable
      // "id" column the way the others do, so it's keyed on month instead, which the view does
      // always return and which is naturally unique per org.
      monthly_pnl: "month, org_id",
    });
    // Version 3: fixes a real bug in version 2 — crop_inventory rows (from lib/data.ts's
    // getInventory, which queries the crop_inventory view) come back keyed by crop_id, not id;
    // that view has no "id" column at all. Version 2 declared "id, org_id" as the key anyway,
    // which meant every cacheRows() call for this table was silently failing to store anything
    // (Dexie can't index a field that isn't there). Found while wiring Phase 3 of the local-first
    // rewrite (Inventory/Crops pages) — Dexie doesn't allow changing a store's primary key within
    // one version, so this drops the table...
    this.version(3).stores({
      crop_inventory: null,
    });
    // ...and this recreates it with the correct key. Two-step delete-then-recreate is the pattern
    // Dexie expects for a primary-key change; harmless here since crop_inventory is a fully
    // derived/re-fetchable cache, not a source of truth.
    this.version(4).stores({
      batches: "id, org_id, status",
      animals: "id, org_id, status",
      animal_health_logs: "id, org_id, animal_id",
      grazing_events: "id, org_id, field_id",
      environmental_logs: "id, org_id, batch_id",
      fields: "id, org_id",
      purchases: "id, org_id",
      sales: "id, org_id",
      sales_channels: "id, org_id",
      crops: "id, org_id",
      goals: "id, org_id",
      crop_inventory: "crop_id, org_id",
      market_watchlist: "id, org_id",
      monthly_pnl: "month, org_id",
    });
    // Version 5: added for Phase 5's pass through the remaining office pages — SOPs is a simple
    // single-table page (id, org_id key, same shape as everything else), so it's the first of that
    // batch to get the local-first treatment.
    this.version(5).stores({
      batches: "id, org_id, status",
      animals: "id, org_id, status",
      animal_health_logs: "id, org_id, animal_id",
      grazing_events: "id, org_id, field_id",
      environmental_logs: "id, org_id, batch_id",
      fields: "id, org_id",
      purchases: "id, org_id",
      sales: "id, org_id",
      sales_channels: "id, org_id",
      crops: "id, org_id",
      goals: "id, org_id",
      crop_inventory: "crop_id, org_id",
      market_watchlist: "id, org_id",
      monthly_pnl: "month, org_id",
      sops: "id, org_id",
    });
    // Version 6: Schedule, Labor, and CEA — the three remaining office pages assessed as worth
    // converting (see HarvestOS_Local_First_Rewrite_Plan.md's Phase 5 notes for the reasoning on
    // why these three and not Profitability/Compliance/Map/Settings/Admin).
    this.version(6).stores({
      batches: "id, org_id, status",
      animals: "id, org_id, status",
      animal_health_logs: "id, org_id, animal_id",
      grazing_events: "id, org_id, field_id",
      environmental_logs: "id, org_id, batch_id",
      fields: "id, org_id",
      purchases: "id, org_id",
      sales: "id, org_id",
      sales_channels: "id, org_id",
      crops: "id, org_id",
      goals: "id, org_id",
      crop_inventory: "crop_id, org_id",
      market_watchlist: "id, org_id",
      monthly_pnl: "month, org_id",
      sops: "id, org_id",
      schedule_events: "id, org_id",
      labor_entries: "id, org_id",
      cea_areas: "id, org_id",
      cea_facilities: "id, org_id",
    });
  }
}

// A missing IndexedDB (very old browser, or a privacy mode that disables it) shouldn't take the
// app down — every helper below degrades to a no-op/empty-result rather than throwing, so callers
// don't need to feature-detect this themselves.
let db: HarvestLocalDB | null = null;
function getDb(): HarvestLocalDB | null {
  if (typeof window === "undefined") return null;
  if (db) return db;
  try {
    db = new HarvestLocalDB();
    return db;
  } catch {
    return null;
  }
}

const TABLES = [
  "batches", "animals", "animal_health_logs", "grazing_events", "environmental_logs", "fields",
  "purchases", "sales", "sales_channels", "crops", "goals", "crop_inventory", "market_watchlist", "monthly_pnl",
  "sops", "schedule_events", "labor_entries", "cea_areas", "cea_facilities",
] as const;
export type CachedTable = (typeof TABLES)[number];

// Call this whenever a page or form successfully loads rows from Supabase — writes them into the
// local cache so they're available (read-only) the next time this device can't reach Supabase for
// that same data, no matter which page needs it. Silently does nothing if `rows` came from
// DEMO_MODE mock data or is otherwise not real org data — callers just pass whatever they fetched.
export async function cacheRows(table: CachedTable, orgId: string, rows: Record<string, any>[]): Promise<void> {
  const local = getDb();
  if (!local || !orgId || !rows?.length) return;
  try {
    const stamped = rows.map((row) => ({ ...row, org_id: orgId, _cachedAt: Date.now() }));
    await local.table(table).bulkPut(stamped);
  } catch {
    // Best-effort — a cache write failing (quota, corrupted DB, etc.) shouldn't surface to the
    // user or block whatever real action they were doing.
  }
}

// Reads back whatever's cached for this org, oldest-first-stable so callers can show a
// "as of [time]" note if they want. Returns [] (not an error) if nothing's cached yet or
// IndexedDB isn't available — this is a fallback data source, not a required one.
export async function getCachedRows<T = Record<string, any>>(table: CachedTable, orgId: string): Promise<T[]> {
  const local = getDb();
  if (!local || !orgId) return [];
  try {
    const rows = await local.table(table).where("org_id").equals(orgId).toArray();
    return rows as T[];
  } catch {
    return [];
  }
}

// Newest cache timestamp for a table — lets a page show "showing cached data from 3 hours ago"
// instead of silently presenting stale data as if it were fresh.
export async function getCacheAge(table: CachedTable, orgId: string): Promise<number | null> {
  const rows = await getCachedRows<{ _cachedAt: number }>(table, orgId);
  if (rows.length === 0) return null;
  return Math.max(...rows.map((r) => r._cachedAt));
}

export async function deleteCachedRow(table: CachedTable, id: string): Promise<void> {
  const local = getDb();
  if (!local) return;
  try {
    await local.table(table).delete(id);
  } catch {
    // Best-effort, same as above.
  }
}
