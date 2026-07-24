"use client";

import { useState } from "react";
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
  const [showForm, setShowForm] = useState(false);
  const total = purchases.reduce((a, p) => a + (p.total ?? 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="text-sm text-stone-500">Total spend: <span className="font-semibold text-stone-800">{fmtCurrency2(total)}</span></div>
        {!showForm && <button className="btn-primary" onClick={() => setShowForm(true)}>+ Add purchase</button>}
      </div>
      {showForm && (
        <PurchaseForm orgId={orgId} crops={crops} fields={fields} supplies={supplies} animals={animals} onDone={() => setShowForm(false)} />
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
