"use client";

import { Fragment, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { DEMO_MODE } from "@/lib/demo-mode";
import { EmptyState } from "@/components/ui";
import InventoryAdjustForm from "@/components/forms/InventoryAdjustForm";
import FarmSuppliesSection from "@/components/FarmSuppliesSection";

type InventoryRow = {
  crop_id: string;
  crop_name: string;
  seed_g_on_hand: number;
  harvest_oz_on_hand: number;
  sow_rate_g: number | null;
  low_stock_threshold_trays: number | null;
  sowable_trays_remaining: number | null;
};

export default function InventoryClient({
  orgId, inventory, role, supplies = [],
}: { orgId: string; inventory: InventoryRow[]; role: string; supplies?: any[] }) {
  const supabase = createClient();
  const router = useRouter();
  const canEdit = role === "owner" || role === "admin";
  const [thresholds, setThresholds] = useState<Record<string, string>>(
    Object.fromEntries(inventory.map((i) => [i.crop_id, i.low_stock_threshold_trays?.toString() ?? ""]))
  );
  const [adjustingCropId, setAdjustingCropId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  async function exportMovementsCsv() {
    if (DEMO_MODE) return;
    setExporting(true);
    try {
      const { data, error } = await supabase
        .from("inventory_movements")
        .select("created_at, kind, delta, reason, source_table, crops(name)")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false });
      if (error) throw error;

      const rows = (data ?? []) as unknown as {
        created_at: string; kind: string; delta: number; reason: string | null;
        source_table: string | null; crops: { name: string } | null;
      }[];

      const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
      const header = ["Date", "Crop", "Kind", "Delta", "Reason", "Source"];
      const lines = [
        header.join(","),
        ...rows.map((r) =>
          [
            escape(new Date(r.created_at).toLocaleString()),
            escape(r.crops?.name ?? ""),
            escape(r.kind),
            String(r.delta),
            escape(r.reason ?? ""),
            escape(r.source_table ?? "adjustment"),
          ].join(",")
        ),
      ];

      const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `inventory-movements-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  async function saveThreshold(cropId: string) {
    if (DEMO_MODE) return;
    const raw = thresholds[cropId];
    const value = raw === "" ? null : Number(raw);
    await supabase.from("crops").update({ low_stock_threshold_trays: value }).eq("id", cropId);
    router.refresh();
  }

  const suppliesSection = (
    <FarmSuppliesSection
      orgId={orgId}
      supplies={supplies}
      categories={["nutrient", "commercial_seed"]}
      title="Nutrients & commercial seed"
      hint="Fertilizer/amendment stock and bulk commercial-scale seed — separate from the microgreens seed tracked above."
      isEditor={canEdit || role === "member"}
    />
  );

  if (inventory.length === 0) {
    return (
      <div className="space-y-4">
        <EmptyState title="No crop inventory yet" hint="Inventory fills in automatically as you log seed purchases, start batches, and log harvests." />
        {suppliesSection}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button className="btn-secondary !py-1.5 text-sm" onClick={exportMovementsCsv} disabled={exporting}>
          {exporting ? "Exporting…" : "Export movements CSV"}
        </button>
      </div>
      <div className="card overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-stone-50 text-xs text-stone-500 uppercase tracking-wide">
          <tr>
            <th className="text-left py-3 px-4">Crop</th>
            <th className="text-right py-3 px-4">Seed on hand (g)</th>
            <th className="text-right py-3 px-4">Sowable trays</th>
            <th className="text-right py-3 px-4">Low-stock alert (trays)</th>
            <th className="text-right py-3 px-4">Harvested on hand (oz)</th>
            {canEdit && <th className="text-right py-3 px-4"></th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {inventory.map((i) => {
            const low =
              i.low_stock_threshold_trays != null &&
              i.sowable_trays_remaining != null &&
              i.sowable_trays_remaining <= i.low_stock_threshold_trays;
            const noSeed = i.seed_g_on_hand <= 0;
            return (
              <Fragment key={i.crop_id}>
                <tr className={low || noSeed ? "bg-red-50/60" : ""}>
                  <td className="py-2.5 px-4 font-medium text-stone-700">
                    {i.crop_name}
                    {(low || noSeed) && <span className="ml-2 badge bg-red-100 text-red-700">Low stock</span>}
                  </td>
                  <td className="py-2.5 px-4 text-right">{i.seed_g_on_hand.toFixed(1)}</td>
                  <td className="py-2.5 px-4 text-right">
                    {i.sow_rate_g ? i.sowable_trays_remaining?.toFixed(1) : <span className="text-stone-300">set sow rate</span>}
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    {canEdit ? (
                      <input
                        className="input !py-1 !w-20 text-right text-xs"
                        type="number"
                        min={0}
                        value={thresholds[i.crop_id] ?? ""}
                        onChange={(e) => setThresholds((prev) => ({ ...prev, [i.crop_id]: e.target.value }))}
                        onBlur={() => saveThreshold(i.crop_id)}
                        placeholder="—"
                      />
                    ) : (
                      i.low_stock_threshold_trays ?? "—"
                    )}
                  </td>
                  <td className="py-2.5 px-4 text-right">{i.harvest_oz_on_hand.toFixed(1)}</td>
                  {canEdit && (
                    <td className="py-2.5 px-4 text-right">
                      <button
                        className="text-xs font-medium text-brand-700 hover:underline"
                        onClick={() => setAdjustingCropId(adjustingCropId === i.crop_id ? null : i.crop_id)}
                      >
                        Adjust
                      </button>
                    </td>
                  )}
                </tr>
                {canEdit && adjustingCropId === i.crop_id && (
                  <tr>
                    <td colSpan={6} className="px-4 pb-3">
                      <InventoryAdjustForm
                        orgId={orgId}
                        cropId={i.crop_id}
                        cropName={i.crop_name}
                        onDone={() => setAdjustingCropId(null)}
                      />
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
      </div>
      {suppliesSection}
    </div>
  );
}
