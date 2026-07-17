import { NextResponse, type NextRequest } from "next/server";
import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";

// Daily digest push notifications: low-stock crops and harvest-due batches, one summary
// notification per org (not one per item — a daily digest is far less annoying than a flood of
// pushes, and still gets the point across standing in the grow room). Intended to be hit by a
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

  const [{ data: inventory }, { data: batches }, { data: subs }] = await Promise.all([
    supabase
      .from("crop_inventory")
      .select("org_id, crop_name, low_stock_threshold_trays, sowable_trays_remaining"),
    supabase
      .from("batches")
      .select("org_id, batch_id, crop_name_snapshot, plant_date, status, crops(total_cycle_days_max)")
      .in("status", ["germinating", "growing"]),
    supabase.from("push_subscriptions").select("org_id, endpoint, p256dh, auth_key"),
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

  const orgIds = new Set([...lowStockByOrg.keys(), ...harvestDueByOrg.keys()]);
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
    const parts = [];
    if (lowStock.length) parts.push(`Low stock: ${lowStock.join(", ")}`);
    if (harvestDue.length) parts.push(`Harvest due: ${harvestDue.join(", ")}`);
    const body = parts.join(" · ");
    if (!body) continue;

    for (const sub of subsByOrg.get(orgId) ?? []) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth_key },
          },
          JSON.stringify({ title: "Harvest OS", body, url: "/dashboard" })
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

  return NextResponse.json({ orgsWithAlerts: orgIds.size, sent, pruned });
}
