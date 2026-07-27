"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { DEMO_MODE } from "@/lib/demo-mode";
import { EmptyState, fmtCurrency2 } from "@/components/ui";
import PurchaseForm from "@/components/forms/PurchaseForm";
import EquipmentSection from "@/components/EquipmentSection";
import FarmSuppliesSection from "@/components/FarmSuppliesSection";

export default function PurchasesClient({
  orgId, purchases, crops, fields = [], supplies = [], equipmentSupplies = [], animals = [], equipment = [], isEditor = false,
}: {
  orgId: string;
  purchases: any[];
  crops: any[];
  fields?: any[];
  supplies?: any[];
  equipmentSupplies?: any[];
  animals?: any[];
  equipment?: any[];
  isEditor?: boolean;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const total = purchases.reduce((a, p) => a + (p.total ?? 0), 0);
  const editingPurchase = purchases.find((p) => p.id === editingId);

  async function deletePurchase(id: string, itemName: string) {
    if (DEMO_MODE) return;
    if (!window.confirm(`Delete "${itemName}"? This can't be undone — any inventory it added (e.g. seed grams) will be reversed automatically.`)) return;
    await supabase.from("purchases").delete().eq("id", id);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="text-sm text-stone-500">Total spend: <span className="font-semibold text-stone-800">{fmtCurrency2(total)}</span></div>
        {!showForm && !editingId && <button className="btn-primary" onClick={() => setShowForm(true)}>+ Add purchase</button>}
      </div>
      {showForm && (
        <PurchaseForm orgId={orgId} crops={crops} fields={fields} supplies={supplies} animals={animals} onDone={() => setShowForm(false)} />
      )}
      {editingPurchase && (
        <PurchaseForm
          orgId={orgId}
          crops={crops}
          fields={fields}
          supplies={supplies}
          animals={animals}
          existingPurchase={editingPurchase}
          onDone={() => setEditingId(null)}
        />
      )}

      {purchases.length === 0 ? (
        <EmptyState title="No purchases logged yet" hint="Log seeds, trays, equipment, and supplies here to track real cost per tray." />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-xs text-stone-500 uppercase tracking-wide">
              <tr>
                <th className="text-left py-3 px-4">Date</th>
                <th className="text-left py-3 px-4">Item</th>
                <th className="text-left py-3 px-4">Category</th>
                <th className="text-left py-3 px-4">Vendor</th>
                <th className="text-right py-3 px-4">Total</th>
                {isEditor && <th className="text-right py-3 px-4">&nbsp;</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {purchases.map((p) => (
                <tr key={p.id}>
                  <td className="py-2.5 px-4 text-stone-500">{p.purchase_date}</td>
                  <td className="py-2.5 px-4 font-medium text-stone-700">{p.item}</td>
                  <td className="py-2.5 px-4 text-stone-500">{p.category}</td>
                  <td className="py-2.5 px-4 text-stone-500">{p.vendor ?? "—"}</td>
                  <td className="py-2.5 px-4 text-right font-medium">{fmtCurrency2(p.total)}</td>
                  {isEditor && (
                    <td className="py-2.5 px-4 text-right whitespace-nowrap">
                      <button
                        className="text-xs font-medium text-brand-700 hover:underline mr-3"
                        onClick={() => { setEditingId(p.id); setShowForm(false); }}
                      >
                        Edit
                      </button>
                      <button
                        className="text-xs font-medium text-red-600 hover:underline"
                        onClick={() => deletePurchase(p.id, p.item)}
                      >
                        Delete
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <FarmSuppliesSection
        orgId={orgId}
        supplies={equipmentSupplies}
        categories={["equipment"]}
        title="Farm & ranch equipment — stock on hand"
        hint="Smaller equipment/tools you keep count of (e.g. a box of hand tools). For big-ticket depreciable purchases (tractors, etc.), use the Equipment purchase mode above instead — that's tracked below with depreciation."
        isEditor={isEditor}
      />

      <EquipmentSection rows={equipment} />
    </div>
  );
}
