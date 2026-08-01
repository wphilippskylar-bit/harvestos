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
// Scoped to the same five field-critical tables as the rest of Phase 1 — the remaining tables
// (purchases, sales, crops, etc.) get the same treatment in Phase 3.

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

// Runs one full pull pass for the org, caching every table's rows into Dexie as they arrive. Each
// table pulls independently (`.catch(() => null)`) — one failing (a transient error, a table this
// org's RLS doesn't grant) shouldn't block the others from updating.
export async function syncPull(orgId: string): Promise<void> {
  if (!orgId) return;

  const [batches, animals, grazingEvents, environmentalLogs, fields] = await Promise.all([
    pullBatches(orgId).catch(() => null),
    pullAnimals(orgId).catch(() => null),
    pullGrazingEvents(orgId).catch(() => null),
    pullEnvironmentalLogs(orgId).catch(() => null),
    pullFields(orgId).catch(() => null),
  ]);

  if (batches) await cacheRows("batches", orgId, batches);
  if (animals) await cacheRows("animals", orgId, animals);
  if (grazingEvents) await cacheRows("grazing_events", orgId, grazingEvents);
  if (environmentalLogs) await cacheRows("environmental_logs", orgId, environmentalLogs);
  if (fields) await cacheRows("fields", orgId, fields);

  // Health logs are keyed off which animals exist, so this only makes sense once the animal list
  // is known — pulled as a second step rather than inside the Promise.all above.
  if (animals && animals.length > 0) {
    const healthLogs = await pullAnimalHealthLogs(orgId, animals.map((a: any) => a.id)).catch(() => null);
    if (healthLogs) await cacheRows("animal_health_logs", orgId, healthLogs);
  }
}
