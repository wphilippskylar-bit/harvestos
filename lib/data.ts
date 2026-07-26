import { createClient } from "@/lib/supabase/server";
import { DEMO_MODE } from "@/lib/demo-mode";
import {
  demoOrg, demoCrops, demoBatches, demoPurchases, demoChannels, demoSales, demoGoals, demoInventory,
} from "@/lib/demo-data";

export type OrgContext = {
  orgId: string;
  orgName: string;
  role: string;
  userId: string | null;
  isDemo: boolean;
  planTier?: string;
  seatLimit?: number;
  batchIdPrefix?: string;
  userEmail?: string | null;
  operationTypes?: string[];
  agTaxExempt?: boolean;
  weightUnit?: string;
  areaUnit?: string;
  scheduleNotifyMode?: string;
};

export async function getOrgContext(): Promise<OrgContext> {
  if (DEMO_MODE) {
    return {
      orgId: demoOrg.id,
      orgName: demoOrg.name,
      role: "owner",
      userId: "demo-user",
      isDemo: true,
      planTier: demoOrg.plan_tier,
      seatLimit: 3,
      batchIdPrefix: demoOrg.batch_id_prefix,
      userEmail: "you@example.com",
      operationTypes: ["microgreens"],
      agTaxExempt: false,
      weightUnit: "oz",
      areaUnit: "acres",
      scheduleNotifyMode: "digest",
    };
  }
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { orgId: "", orgName: "", role: "", userId: null, isDemo: false };

  const { data: membership } = await supabase
    .from("memberships")
    .select("org_id, role, organizations(name, plan_tier, seat_limit, batch_id_prefix, operation_types, ag_tax_exempt, weight_unit, area_unit, schedule_notify_mode)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!membership) return { orgId: "", orgName: "", role: "", userId: user.id, isDemo: false, userEmail: user.email };
  const org = membership.organizations as unknown as { name: string; plan_tier: string; seat_limit: number; batch_id_prefix: string; operation_types: string[]; ag_tax_exempt: boolean; weight_unit: string; area_unit: string; schedule_notify_mode: string } | null;
  return {
    orgId: membership.org_id,
    orgName: org?.name ?? "",
    role: membership.role,
    userId: user.id,
    isDemo: false,
    planTier: org?.plan_tier,
    seatLimit: org?.seat_limit,
    batchIdPrefix: org?.batch_id_prefix,
    userEmail: user.email,
    operationTypes: org?.operation_types ?? ["microgreens"],
    agTaxExempt: org?.ag_tax_exempt ?? false,
    weightUnit: org?.weight_unit ?? "lb",
    areaUnit: org?.area_unit ?? "acres",
    scheduleNotifyMode: org?.schedule_notify_mode ?? "digest",
  };
}

export async function getCrops(orgId: string) {
  if (DEMO_MODE) return demoCrops;
  const supabase = createClient();
  const { data } = await supabase.from("crops").select("*").eq("org_id", orgId).order("name");
  return data ?? [];
}

export async function getBatches(orgId: string) {
  if (DEMO_MODE) return demoBatches;
  const supabase = createClient();
  const { data } = await supabase.from("batches").select("*").eq("org_id", orgId).order("plant_date", { ascending: false });
  return data ?? [];
}

export async function getPurchases(orgId: string) {
  if (DEMO_MODE) return demoPurchases;
  const supabase = createClient();
  const { data } = await supabase.from("purchases").select("*").eq("org_id", orgId).order("purchase_date", { ascending: false });
  return data ?? [];
}

export async function getSalesChannels(orgId: string) {
  if (DEMO_MODE) return demoChannels;
  const supabase = createClient();
  const { data } = await supabase.from("sales_channels").select("*").eq("org_id", orgId).order("priority");
  return data ?? [];
}

export async function getSales(orgId: string) {
  if (DEMO_MODE) return demoSales;
  const supabase = createClient();
  const { data } = await supabase.from("sales").select("*").eq("org_id", orgId).order("sale_date", { ascending: false });
  return data ?? [];
}

export async function getEnvironmentalLogs(orgId: string) {
  if (DEMO_MODE) return [];
  const supabase = createClient();
  const { data } = await supabase.from("environmental_logs").select("*").eq("org_id", orgId).order("log_date", { ascending: false }).limit(50);
  return data ?? [];
}

export async function getGoals(orgId: string) {
  if (DEMO_MODE) return demoGoals;
  const supabase = createClient();
  const { data } = await supabase.from("goals").select("*").eq("org_id", orgId).order("created_at");
  return data ?? [];
}

export async function getInventory(orgId: string) {
  if (DEMO_MODE) return demoInventory;
  const supabase = createClient();
  const { data } = await supabase.from("crop_inventory").select("*").eq("org_id", orgId).order("crop_name");
  return data ?? [];
}

export async function getMembers(orgId: string) {
  if (DEMO_MODE) return [{ id: "demo-user", user_id: "demo-user", role: "owner", email: "you@example.com", created_at: null }];
  const supabase = createClient();
  const { data } = await supabase.rpc("org_members_with_email", { target_org: orgId });
  return data ?? [];
}

export async function getFields(orgId: string) {
  if (DEMO_MODE) return [];
  const supabase = createClient();
  const { data } = await supabase
    .from("fields")
    .select("*, field_rows(*), plantings(id, status), soil_tests(id, test_date)")
    .eq("org_id", orgId)
    .order("name");
  return data ?? [];
}

export async function getCeaAreas(orgId: string) {
  if (DEMO_MODE) return [];
  const supabase = createClient();
  const { data } = await supabase
    .from("cea_areas")
    .select("*, cea_area_rows(*), cea_plantings(id, status, crop_name_snapshot, planted_date, growing_medium)")
    .eq("org_id", orgId)
    .order("name");
  return data ?? [];
}

export async function getCeaEnvironmentLogs(areaId: string) {
  if (DEMO_MODE) return [];
  const supabase = createClient();
  const { data } = await supabase
    .from("cea_environment_logs")
    .select("*")
    .eq("area_id", areaId)
    .order("log_date", { ascending: false });
  return data ?? [];
}

export async function getCeaCrops(orgId: string) {
  if (DEMO_MODE) return [];
  const supabase = createClient();
  const { data } = await supabase.from("crops").select("*").eq("org_id", orgId).contains("applicable_to", ["cea"]).order("name");
  return data ?? [];
}

export async function getFieldCropCrops(orgId: string) {
  if (DEMO_MODE) return [];
  const supabase = createClient();
  const { data } = await supabase
    .from("crops")
    .select("id, name, crop_family")
    .eq("org_id", orgId)
    .contains("applicable_to", ["field_crop"])
    .order("name");
  return data ?? [];
}

export async function getAnimals(orgId: string) {
  if (DEMO_MODE) return [];
  const supabase = createClient();
  const [{ data: animals }, { data: statuses }] = await Promise.all([
    supabase.from("animals").select("*").eq("org_id", orgId).order("ear_tag_number"),
    supabase.from("animal_status").select("*").eq("org_id", orgId),
  ]);
  const statusMap = new Map((statuses ?? []).map((s) => [s.animal_id, s]));
  return (animals ?? []).map((a) => ({
    ...a,
    restricted: statusMap.get(a.id)?.restricted ?? false,
    restricted_until: statusMap.get(a.id)?.restricted_until ?? null,
  }));
}

export async function getAnimalHealthLogs(animalId: string) {
  if (DEMO_MODE) return [];
  const supabase = createClient();
  const { data } = await supabase
    .from("animal_health_logs")
    .select("*")
    .eq("animal_id", animalId)
    .order("log_date", { ascending: false });
  return data ?? [];
}

export async function getComplianceReportData(orgId: string, startDate: string, endDate: string) {
  if (DEMO_MODE) return { animals: [], healthLogs: [], grazingEvents: [], plantings: [] };
  const supabase = createClient();
  const [{ data: animals }, { data: statuses }, { data: healthLogs }, { data: grazingEvents }, { data: plantings }] = await Promise.all([
    supabase.from("animals").select("*").eq("org_id", orgId).order("ear_tag_number"),
    supabase.from("animal_status").select("*").eq("org_id", orgId),
    supabase
      .from("animal_health_logs")
      .select("*, animals(ear_tag_number)")
      .eq("org_id", orgId)
      .gte("log_date", startDate)
      .lte("log_date", endDate)
      .order("log_date", { ascending: false }),
    supabase
      .from("grazing_events")
      .select("*, fields(name), field_rows(label)")
      .eq("org_id", orgId)
      .gte("start_date", startDate)
      .lte("start_date", endDate)
      .order("start_date", { ascending: false }),
    // For the FSA-578-style acreage report: every planting in the period, with the field it's on
    // (for acres/boundary) and the row (if planted to a sub-section rather than the whole field).
    supabase
      .from("plantings")
      .select("*, fields(name, size_acres), field_rows(label)")
      .eq("org_id", orgId)
      .gte("planted_date", startDate)
      .lte("planted_date", endDate)
      .order("planted_date", { ascending: false }),
  ]);
  const statusMap = new Map((statuses ?? []).map((s) => [s.animal_id, s]));
  return {
    animals: (animals ?? []).map((a) => ({
      ...a,
      restricted: statusMap.get(a.id)?.restricted ?? false,
      restricted_until: statusMap.get(a.id)?.restricted_until ?? null,
    })),
    healthLogs: healthLogs ?? [],
    grazingEvents: grazingEvents ?? [],
    plantings: plantings ?? [],
  };
}

export async function isPlatformAdmin() {
  if (DEMO_MODE) return false;
  const supabase = createClient();
  const { data, error } = await supabase.rpc("is_platform_admin");
  if (error) return false;
  return !!data;
}

export async function getPlatformAggregateStats() {
  if (DEMO_MODE) return null;
  const supabase = createClient();
  const { data, error } = await supabase.rpc("platform_aggregate_stats");
  if (error || !data || data.length === 0) return null;
  return data[0];
}

export async function getPlatformOrgRoster() {
  if (DEMO_MODE) return [];
  const supabase = createClient();
  const { data, error } = await supabase.rpc("platform_org_roster");
  if (error) return [];
  return data ?? [];
}

export async function getProfitability(orgId: string) {
  if (DEMO_MODE) return { cropMargin: [], fieldMargin: [], animalMargin: [], monthlyPnl: [] };
  const supabase = createClient();
  const [{ data: cropMargin }, { data: fieldMargin }, { data: animalMargin }, { data: monthlyPnl }] =
    await Promise.all([
      supabase.from("crop_margin").select("*").eq("org_id", orgId).order("crop_name"),
      supabase.from("field_margin").select("*").eq("org_id", orgId).order("field_name"),
      supabase.from("animal_margin").select("*").eq("org_id", orgId).order("ear_tag_number"),
      supabase.from("monthly_pnl").select("*").eq("org_id", orgId).order("month", { ascending: false }).limit(12),
    ]);
  return {
    cropMargin: cropMargin ?? [],
    fieldMargin: fieldMargin ?? [],
    animalMargin: animalMargin ?? [],
    monthlyPnl: monthlyPnl ?? [],
  };
}

export async function getFarmSupplies(orgId: string, categories?: string[]) {
  if (DEMO_MODE) return [];
  const supabase = createClient();
  let query = supabase.from("supply_stock").select("*").eq("org_id", orgId).order("name");
  if (categories && categories.length > 0) query = query.in("category", categories);
  const { data } = await query;
  return data ?? [];
}

export async function getHerdSummary(orgId: string) {
  if (DEMO_MODE) return [];
  const supabase = createClient();
  const { data } = await supabase.from("herd_summary").select("*").eq("org_id", orgId).order("breed");
  return data ?? [];
}

export async function getLaborEntries(orgId: string) {
  if (DEMO_MODE) return [];
  const supabase = createClient();
  const { data } = await supabase
    .from("labor_entries")
    .select("*")
    .eq("org_id", orgId)
    .order("work_date", { ascending: false })
    .limit(100);
  return data ?? [];
}

export async function getTaxDeductibleSummary(orgId: string) {
  if (DEMO_MODE) return [];
  const supabase = createClient();
  const { data } = await supabase
    .from("tax_deductible_summary")
    .select("*")
    .eq("org_id", orgId)
    .order("year", { ascending: false })
    .order("category");
  return data ?? [];
}

export async function getEquipmentDepreciation(orgId: string) {
  if (DEMO_MODE) return [];
  const supabase = createClient();
  const { data } = await supabase
    .from("equipment_depreciation")
    .select("*")
    .eq("org_id", orgId)
    .order("purchase_date", { ascending: false });
  return data ?? [];
}

export async function getNavOrder(userId: string | null, orgId: string) {
  if (DEMO_MODE || !userId || !orgId) return null;
  const supabase = createClient();
  const { data } = await supabase
    .from("user_nav_prefs")
    .select("nav_order")
    .eq("user_id", userId)
    .eq("org_id", orgId)
    .maybeSingle();
  return (data?.nav_order as string[] | undefined) ?? null;
}

export async function getDashboardPrefs(userId: string | null, orgId: string) {
  if (DEMO_MODE || !userId || !orgId) return { cardOrder: null as string[] | null, hiddenCards: [] as string[] };
  const supabase = createClient();
  const { data } = await supabase
    .from("user_dashboard_prefs")
    .select("card_order, hidden_cards")
    .eq("user_id", userId)
    .eq("org_id", orgId)
    .maybeSingle();
  return {
    cardOrder: (data?.card_order as string[] | undefined) ?? null,
    hiddenCards: (data?.hidden_cards as string[] | undefined) ?? [],
  };
}

export async function getMarketWatchlist(orgId: string) {
  if (DEMO_MODE) return [];
  const supabase = createClient();
  const { data } = await supabase.from("market_watchlist").select("*").eq("org_id", orgId).order("created_at");
  return data ?? [];
}

export async function getScheduleEvents(orgId: string) {
  if (DEMO_MODE) return [];
  const supabase = createClient();
  const { data } = await supabase
    .from("schedule_events")
    .select("*, batches(batch_id, crop_name_snapshot), fields(name), cea_areas(name), animals(ear_tag_number)")
    .eq("org_id", orgId)
    .order("event_date");
  return data ?? [];
}

export async function getSops(orgId: string) {
  if (DEMO_MODE) return [];
  const supabase = createClient();
  const { data } = await supabase.from("sops").select("*").eq("org_id", orgId).order("title");
  return data ?? [];
}

export async function getGrazingOverview(orgId: string) {
  if (DEMO_MODE) return { fields: [], events: [] };
  const supabase = createClient();
  const [{ data: fields }, { data: events }] = await Promise.all([
    supabase.from("fields").select("id, name, field_rows(id, label)").eq("org_id", orgId).order("name"),
    supabase
      .from("grazing_events")
      .select("*")
      .eq("org_id", orgId)
      .order("start_date", { ascending: false })
      .limit(50),
  ]);
  return { fields: fields ?? [], events: events ?? [] };
}

export async function getPendingInvites(orgId: string) {
  if (DEMO_MODE) return [];
  const supabase = createClient();
  const { data } = await supabase
    .from("org_invites")
    .select("*")
    .eq("org_id", orgId)
    .eq("accepted", false)
    .order("created_at", { ascending: false });
  return data ?? [];
}
