import { NextResponse, type NextRequest } from "next/server";
import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";

// Daily digest push notifications: low-stock crops, harvest-due batches, harvest-due Greenhouse/
// Indoor (CEA) plantings, livestock withdrawal periods clearing in the next 2 days, and Schedule
// tab reminders — one summary notification per org for everything except Schedule items, which
// respect a per-org grouping preference (organizations.schedule_notify_mode): bundled into the
// same digest, sent as their own separate push per item, or off entirely. Not one push per item
// for everything else — a daily digest is far less annoying than a flood of pushes, and still gets
// the point across standing in the grow room. Intended to be hit by a
// scheduled job (Vercel Cron, see vercel.json) — protected by CRON_SECRET so it can't be triggered
// by anyone who finds the URL. Uses the service-role client deliberately: it needs to see every
// org's inventory/batches and every user's push subscription, which client-side RLS would
// (correctly) block.

export const dynamic = "force-dynamic";

type PushRow = { org_id: string; endpoint: string; p256dh: string; auth_key: string };

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    return NextResponse.json({ error: "VAPID keys not configured" }, { status: 500 });
  }
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:hello@craftfarmok.com", publicKey, privateKey);

  const supabase = createAdminClient();

  const [{ data: inventory }, { data: batches }, { data: ceaPlantings }, { data: withdrawalLogs }, { data: subs }, { data: scheduleEvents }, { data: orgs }] = await Promise.all([
    supabase
      .from("crop_inventory")
      .select("org_id, crop_name, low_stock_threshold_trays, sowable_trays_remaining"),
    supabase
      .from("batches")
      .select("org_id, batch_id, crop_name_snapshot, plant_date, status, crops(total_cycle_days_max)")
      .in("status", ["germinating", "growing"]),
    // CEA plantings don't have Batches' cycle-length math (no fixed total_cycle_days) — they track
    // their own expected_harvest_date directly, so "due" just means that date has arrived.
    supabase
      .from("cea_plantings")
      .select("org_id, crop_name_snapshot, expected_harvest_date, status")
      .in("status", ["planted", "growing"])
      .not("expected_harvest_date", "is", null),
    // animal_status (0012) computes restriction from the latest still-open withdrawal_end_date per
    // animal, but the view doesn't expose ear_tag_number and views generally don't support
    // PostgREST's relationship embedding the way a real FK does — so re-derive the same logic
    // directly off animal_health_logs, which does have a real FK to animals and can embed it.
    supabase
      .from("animal_health_logs")
      .select("org_id, animal_id, withdrawal_end_date, animals(ear_tag_number)")
      .not("withdrawal_end_date", "is", null)
      .gte("withdrawal_end_date", new Date().toISOString().slice(0, 10)),
    supabase.from("push_subscriptions").select("org_id, endpoint, p256dh, auth_key"),
    supabase
      .from("schedule_events")
      .select("org_id, title, event_date, remind_days_before")
      .eq("status", "pending")
      .eq("notify", true),
    supabase.from("organizations").select("id, schedule_notify_mode"),
  ]);

  const lowStockByOrg = new Map<string, string[]>();
  for (const row of inventory ?? []) {
    if (
      row.low_stock_threshold_trays != null &&
      row.sowable_trays_remaining != null &&
      row.sowable_trays_remaining <= row.low_stock_threshold_trays
    ) {
      const list = lowStockByOrg.get(row.org_id) ?? [];
      list.push(row.crop_name);
      lowStockByOrg.set(row.org_id, list);
    }
  }

  const today = new Date();
  const harvestDueByOrg = new Map<string, string[]>();
  for (const b of batches ?? []) {
    const maxCycle = (b as any).crops?.total_cycle_days_max;
    if (!maxCycle || !b.plant_date) continue;
    const due = new Date(b.plant_date);
    due.setDate(due.getDate() + maxCycle);
    if (due <= today) {
      const list = harvestDueByOrg.get(b.org_id) ?? [];
      list.push(b.crop_name_snapshot ?? b.batch_id);
      harvestDueByOrg.set(b.org_id, list);
    }
  }

  const ceaHarvestDueByOrg = new Map<string, string[]>();
  for (const p of ceaPlantings ?? []) {
    if (!p.expected_harvest_date) continue;
    const due = new Date(p.expected_harvest_date);
    if (due <= today) {
      const list = ceaHarvestDueByOrg.get(p.org_id) ?? [];
      list.push(p.crop_name_snapshot ?? "Untitled planting");
      ceaHarvestDueByOrg.set(p.org_id, list);
    }
  }

  // Flag withdrawal periods ending in the next 2 days — that's the useful lead time for scheduling
  // a sale/harvest around the clearance date, not just "it's already restricted" (which the
  // Livestock page already shows on every visit and doesn't need a daily push for). An animal can
  // have multiple open withdrawal-period log entries (e.g. two different treatments), so take the
  // LATEST end date per animal first — same "still restricted until the last one clears" logic as
  // the animal_status view — before checking whether that clears within the window.
  const twoDaysOut = new Date(today);
  twoDaysOut.setDate(twoDaysOut.getDate() + 2);
  const latestEndByAnimal = new Map<string, { orgId: string; earTag: string; until: string }>();
  for (const log of (withdrawalLogs ?? []) as any[]) {
    if (!log.withdrawal_end_date) continue;
    const earTag = log.animals?.ear_tag_number ?? log.animal_id;
    const existing = latestEndByAnimal.get(log.animal_id);
    if (!existing || log.withdrawal_end_date > existing.until) {
      latestEndByAnimal.set(log.animal_id, { orgId: log.org_id, earTag, until: log.withdrawal_end_date });
    }
  }
  const withdrawalEndingByOrg = new Map<string, string[]>();
  for (const { orgId, earTag, until } of latestEndByAnimal.values()) {
    const untilDate = new Date(until);
    if (untilDate >= today && untilDate <= twoDaysOut) {
      const list = withdrawalEndingByOrg.get(orgId) ?? [];
      list.push(`${earTag} (clears ${until})`);
      withdrawalEndingByOrg.set(orgId, list);
    }
  }

  // Schedule tab reminders — a reminder is "due" once today reaches (event_date minus
  // remind_days_before), and keeps firing daily (same as harvest-due) until the item is marked
  // done/skipped. Split into digest-mode vs individual-mode orgs so the send loop below knows
  // which orgs get their schedule items folded into the combined body vs sent as their own pushes.
  const notifyModeByOrg = new Map<string, string>((orgs ?? []).map((o: any) => [o.id, o.schedule_notify_mode ?? "digest"]));
  const scheduleDueByOrg = new Map<string, { title: string; event_date: string }[]>();
  for (const ev of (scheduleEvents ?? []) as any[]) {
    if (notifyModeByOrg.get(ev.org_id) === "off") continue;
    const remindFrom = new Date(ev.event_date);
    remindFrom.setDate(remindFrom.getDate() - (ev.remind_days_before ?? 0));
    if (remindFrom > today) continue;
    const list = scheduleDueByOrg.get(ev.org_id) ?? [];
    list.push({ title: ev.title, event_date: ev.event_date });
    scheduleDueByOrg.set(ev.org_id, list);
  }
  const scheduleDigestByOrg = new Map<string, string[]>();
  const scheduleIndividualByOrg = new Map<string, { title: string; event_date: string }[]>();
  for (const [orgId, items] of scheduleDueByOrg) {
    if (notifyModeByOrg.get(orgId) === "individual") {
      scheduleIndividualByOrg.set(orgId, items);
    } else {
      scheduleDigestByOrg.set(orgId, items.map((i) => `${i.title} (${i.event_date})`));
    }
  }

  const orgIds = new Set([
    ...lowStockByOrg.keys(),
    ...harvestDueByOrg.keys(),
    ...ceaHarvestDueByOrg.keys(),
    ...withdrawalEndingByOrg.keys(),
    ...scheduleDigestByOrg.keys(),
    ...scheduleIndividualByOrg.keys(),
  ]);
  const subsByOrg = new Map<string, PushRow[]>();
  for (const s of (subs ?? []) as PushRow[]) {
    if (!orgIds.has(s.org_id)) continue;
    const list = subsByOrg.get(s.org_id) ?? [];
    list.push(s);
    subsByOrg.set(s.org_id, list);
  }

  let sent = 0;
  let pruned = 0;
  for (const orgId of orgIds) {
    const lowStock = lowStockByOrg.get(orgId) ?? [];
    const harvestDue = harvestDueByOrg.get(orgId) ?? [];
    const ceaHarvestDue = ceaHarvestDueByOrg.get(orgId) ?? [];
    const withdrawalEnding = withdrawalEndingByOrg.get(orgId) ?? [];
    const scheduleDigest = scheduleDigestByOrg.get(orgId) ?? [];
    const parts = [];
    if (lowStock.length) parts.push(`Low stock: ${lowStock.join(", ")}`);
    if (harvestDue.length) parts.push(`Harvest due: ${harvestDue.join(", ")}`);
    if (ceaHarvestDue.length) parts.push(`Greenhouse/Indoor harvest due: ${ceaHarvestDue.join(", ")}`);
    if (withdrawalEnding.length) parts.push(`Withdrawal clearing soon: ${withdrawalEnding.join(", ")}`);
    if (scheduleDigest.length) parts.push(`Schedule: ${scheduleDigest.join(", ")}`);
    const body = parts.join(" · ");

    const subsForOrg = subsByOrg.get(orgId) ?? [];

    async function sendToOrg(pushBody: string) {
      for (const sub of subsForOrg) {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
            JSON.stringify({ title: "Harvest OS", body: pushBody, url: "/dashboard" })
          );
          sent++;
        } catch (err: any) {
          // 404/410 means the browser unsubscribed or the subscription expired — clean it up so
          // future runs don't keep failing on it.
          if (err?.statusCode === 404 || err?.statusCode === 410) {
            await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
            pruned++;
          }
        }
      }
    }

    if (body) await sendToOrg(body);

    // Individual-mode orgs get each schedule item as its own separate push, on top of (not
    // instead of) the combined digest above for everything else.
    for (const item of scheduleIndividualByOrg.get(orgId) ?? []) {
      await sendToOrg(`Schedule: ${item.title} (${item.event_date})`);
    }
  }

  return NextResponse.json({ orgsWithAlerts: orgIds.size, sent, pruned });
}
