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
    };
  }
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { orgId: "", orgName: "", role: "", userId: null, isDemo: false };

  const { data: membership } = await supabase
    .from("memberships")
    .select("org_id, role, organizations(name, plan_tier, seat_limit, batch_id_prefix, operation_types, ag_tax_exempt)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!membership) return { orgId: "", orgName: "", role: "", userId: user.id, isDemo: false, userEmail: user.email };
  const org = membership.organizations as unknown as { name: string; plan_tier: string; seat_limit: number; batch_id_prefix: string; operation_types: string[]; ag_tax_exempt: boolean } | null;
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
