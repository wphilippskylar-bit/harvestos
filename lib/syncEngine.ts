"use client";

import { createClient } from "@/lib/supabase/client";
import { cacheRows } from "@/lib/localDb";

// Phase 1 of the local-first rewrite (see HarvestOS_Local_First_Rewrite_Plan.md in the project
// docs). The prior offline work only ever wrote to Dexie reactively — whenever a page's own
// server-rendered props happened to include fresh rows for the table it needed. This pulls the
// field-critical tables into Dexie proactively, independent of which pages have actually been
// visited this session. That's what lets a page you haven't opened yet still have real (if
// slightly stale) data waiting in Dexie once it's converted to read from there instead of a
// server prop (Phase 2) — today nothing does that yet; this just starts keeping the cache warm.
//
// Queries mirror the equivalent server-side ones in lib/data.ts (getBatches, getAnimals, etc.) as
// closely as possible, but run against the browser Supabase client since this executes entirely
// client-side, on a timer, not as part of any page's own render.
//
// Phase 3 extends this to purchases, sales, sales_channels, crops, and crop_inventory — the
// tables the office-side pages (Purchases, Sales, Crops, Inventory, Channels) now read live from.

async function pullBatches(orgId: string) {
  const supabase = createClient();
  const { data } = await supabase.from("batches").select("*").eq("org_id", orgId).order("plant_date", { ascending: false });
  return data ?? [];
}

async function pullAnimals(orgId: string) {
  const supabase = createClient();
  const [{ data: animals }, { data: statuses }] = await Promise.all([
    supabase.from("animals").select("*").eq("org_id", orgId).order("ear_tag_number"),
    supabase.from("animal_status").select("*").eq("org_id", orgId),
  ]);
  const statusMap = new Map((statuses ?? []).map((s: any) => [s.animal_id, s]));
  return (animals ?? []).map((a: any) => ({ ...a, ...(statusMap.get(a.id) ?? {}) }));
}

async function pullAnimalHealthLogs(orgId: string, animalIds: string[]) {
  if (animalIds.length === 0) return [];
  const supabase = createClient();
  const { data } = await supabase
    .from("animal_health_logs")
    .select("*")
    .eq("org_id", orgId)
    .in("animal_id", animalIds)
    .order("log_date", { ascending: false });
  return data ?? [];
}

async function pullGrazingEvents(orgId: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from("grazing_events")
    .select("*")
    .eq("org_id", orgId)
    .order("start_date", { ascending: false })
    .limit(50);
  return data ?? [];
}

async function pullEnvironmentalLogs(orgId: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from("environmental_logs")
    .select("*")
    .eq("org_id", orgId)
    .order("log_date", { ascending: false })
    .limit(50);
  return data ?? [];
}

async function pullFields(orgId: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from("fields")
    .select("*, field_rows(*), plantings(id, status), soil_tests(id, test_date)")
    .eq("org_id", orgId)
    .order("name");
  return data ?? [];
}

async function pullPurchases(orgId: string) {
  const supabase = createClient();
  const { data } = await supabase.from("purchases").select("*").eq("org_id", orgId).order("purchase_date", { ascending: false });
  return data ?? [];
}

async function pullSales(orgId: string) {
  const supabase = createClient();
  const { data } = await supabase.from("sales").select("*").eq("org_id", orgId).order("sale_date", { ascending: false });
  return data ?? [];
}

async function pullSalesChannels(orgId: string) {
  const supabase = createClient();
  const { data } = await supabase.from("sales_channels").select("*").eq("org_id", orgId);
  return data ?? [];
}

async function pullCrops(orgId: string) {
  const supabase = createClient();
  const { data } = await supabase.from("crops").select("*").eq("org_id", orgId).order("name");
  return data ?? [];
}

async function pullCropInventory(orgId: string) {
  const supabase = createClient();
  const { data } = await supabase.from("crop_inventory").select("*").eq("org_id", orgId).order("crop_name");
  return data ?? [];
}

async function pullGoals(orgId: string) {
  const supabase = createClient();
  const { data } = await supabase.from("goals").select("*").eq("org_id", orgId).order("created_at");
  return data ?? [];
}

async function pullMarketWatchlist(orgId: string) {
  const supabase = createClient();
  const { data } = await supabase.from("market_watchlist").select("*").eq("org_id", orgId).order("created_at");
  return data ?? [];
}

async function pullMonthlyPnl(orgId: string) {
  const supabase = createClient();
  const { data } = await supabase.from("monthly_pnl").select("*").eq("org_id", orgId).order("month", { ascending: false }).limit(12);
  return data ?? [];
}

async function pullSops(orgId: string) {
  const supabase = createClient();
  const { data } = await supabase.from("sops").select("*").eq("org_id", orgId).order("title");
  return data ?? [];
}

async function pullScheduleEvents(orgId: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from("schedule_events")
    .select("*, batches(batch_id, crop_name_snapshot), fields(name), cea_areas(name), animals(ear_tag_number)")
    .eq("org_id", orgId)
    .order("event_date");
  return data ?? [];
}

async function pullLaborEntries(orgId: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from("labor_entries")
    .select("*")
    .eq("org_id", orgId)
    .order("work_date", { ascending: false })
    .limit(100);
  return data ?? [];
}

async function pullCeaAreas(orgId: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from("cea_areas")
    .select("*, cea_area_rows(*), cea_plantings(id, status, crop_name_snapshot, planted_date, growing_medium)")
    .eq("org_id", orgId)
    .order("name");
  return data ?? [];
}

async function pullCeaFacilities(orgId: string) {
  const supabase = createClient();
  const { data } = await supabase.from("cea_facilities").select("*").eq("org_id", orgId).order("name");
  return data ?? [];
}

// Runs one full pull pass for the org, caching every table's rows into Dexie as they arrive. Each
// table pulls independently (`.catch(() => null)`) — one failing (a transient error, a table this
// org's RLS doesn't grant) shouldn't block the others from updating.
export async function syncPull(orgId: string): Promise<void> {
  if (!orgId) return;

  const [batches, animals, grazingEvents, environmentalLogs, fields, purchases, sales, salesChannels, crops, cropInventory, goals, marketWatchlist, monthlyPnl, sops, scheduleEvents, laborEntries, ceaAreas, ceaFacilities] = await Promise.all([
    pullBatches(orgId).catch(() => null),
    pullAnimals(orgId).catch(() => null),
    pullGrazingEvents(orgId).catch(() => null),
    pullEnvironmentalLogs(orgId).catch(() => null),
    pullFields(orgId).catch(() => null),
    pullPurchases(orgId).catch(() => null),
    pullSales(orgId).catch(() => null),
    pullSalesChannels(orgId).catch(() => null),
    pullCrops(orgId).catch(() => null),
    pullCropInventory(orgId).catch(() => null),
    pullGoals(orgId).catch(() => null),
    pullMarketWatchlist(orgId).catch(() => null),
    pullMonthlyPnl(orgId).catch(() => null),
    pullSops(orgId).catch(() => null),
    pullScheduleEvents(orgId).catch(() => null),
    pullLaborEntries(orgId).catch(() => null),
    pullCeaAreas(orgId).catch(() => null),
    pullCeaFacilities(orgId).catch(() => null),
  ]);

  if (batches) await cacheRows("batches", orgId, batches);
  if (animals) await cacheRows("animals", orgId, animals);
  if (grazingEvents) await cacheRows("grazing_events", orgId, grazingEvents);
  if (environmentalLogs) await cacheRows("environmental_logs", orgId, environmentalLogs);
  if (fields) await cacheRows("fields", orgId, fields);
  if (purchases) await cacheRows("purchases", orgId, purchases);
  if (sales) await cacheRows("sales", orgId, sales);
  if (salesChannels) await cacheRows("sales_channels", orgId, salesChannels);
  if (crops) await cacheRows("crops", orgId, crops);
  if (cropInventory) await cacheRows("crop_inventory", orgId, cropInventory);
  if (goals) await cacheRows("goals", orgId, goals);
  if (marketWatchlist) await cacheRows("market_watchlist", orgId, marketWatchlist);
  if (monthlyPnl) await cacheRows("monthly_pnl", orgId, monthlyPnl);
  if (sops) await cacheRows("sops", orgId, sops);
  if (scheduleEvents) await cacheRows("schedule_events", orgId, scheduleEvents);
  if (laborEntries) await cacheRows("labor_entries", orgId, laborEntries);
  if (ceaAreas) await cacheRows("cea_areas", orgId, ceaAreas);
  if (ceaFacilities) await cacheRows("cea_facilities", orgId, ceaFacilities);

  // Health logs are keyed off which animals exist, so this only makes sense once the animal list
  // is known — pulled as a second step rather than inside the Promise.all above.
  if (animals && animals.length > 0) {
    const healthLogs = await pullAnimalHealthLogs(orgId, animals.map((a: any) => a.id)).catch(() => null);
    if (healthLogs) await cacheRows("animal_health_logs", orgId, healthLogs);
  }
}

// Phase 4 (Realtime, see HarvestOS_Local_First_Rewrite_Plan.md) needs to re-pull a single table the
// instant Realtime says it changed, rather than waiting for the next full syncPull. Reuses the same
// pull functions above rather than duplicating query logic.
const SIMPLE_PULLERS: Record<string, (orgId: string) => Promise<any[]>> = {
  batches: pullBatches,
  grazing_events: pullGrazingEvents,
  environmental_logs: pullEnvironmentalLogs,
  fields: pullFields,
  purchases: pullPurchases,
  sales: pullSales,
  sales_channels: pullSalesChannels,
  crops: pullCrops,
  crop_inventory: pullCropInventory,
  goals: pullGoals,
  market_watchlist: pullMarketWatchlist,
  monthly_pnl: pullMonthlyPnl,
  sops: pullSops,
  schedule_events: pullScheduleEvents,
  labor_entries: pullLaborEntries,
  cea_areas: pullCeaAreas,
  cea_facilities: pullCeaFacilities,
};

export type SyncTable = keyof typeof SIMPLE_PULLERS | "animals";

export async function syncOne(table: SyncTable, orgId: string): Promise<void> {
  if (!orgId) return;

  if (table === "animals") {
    const animals = await pullAnimals(orgId).catch(() => null);
    if (!animals) return;
    await cacheRows("animals", orgId, animals);
    // Same reasoning as syncPull: health logs are keyed off which animals exist.
    if (animals.length > 0) {
      const healthLogs = await pullAnimalHealthLogs(orgId, animals.map((a: any) => a.id)).catch(() => null);
      if (healthLogs) await cacheRows("animal_health_logs", orgId, healthLogs);
    }
    return;
  }

  const puller = SIMPLE_PULLERS[table];
  if (!puller) return;
  const rows = await puller(orgId).catch(() => null);
  if (rows) await cacheRows(table as any, orgId, rows);
}
