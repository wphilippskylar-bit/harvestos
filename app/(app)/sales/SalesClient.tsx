"use client";

import { useState } from "react";
import { EmptyState, fmtCurrency2 } from "@/components/ui";
import SaleForm from "@/components/forms/SaleForm";

export default function SalesClient({
  orgId, sales, channels, crops, fields = [], animals = [],
}: { orgId: string; sales: any[]; channels: any[]; crops: any[]; fields?: any[]; animals?: any[] }) {
  const [showForm, setShowForm] = useState(false);
  const total = sales.reduce((a, s) => a + (s.total_revenue ?? s.quantity * s.unit_price), 0);
  const channelMap = Object.fromEntries(channels.map((c) => [c.id, c.name]));
  const cropMap = Object.fromEntries(crops.map((c) => [c.id, c.name]));

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm text-stone-500">Total revenue: <span className="font-semibold text-stone-800">{fmtCurrency2(total)}</span></div>
        {!showForm && <button className="btn-primary" onClick={() => setShowForm(true)}>+ Log sale</button>}
      </div>
      {showForm && (
        <SaleForm orgId={orgId} channels={channels} crops={crops} fields={fields} animals={animals} onDone={() => setShowForm(false)} />
      )}

      {sales.length === 0 ? (
        <EmptyState title="No sales logged yet" hint="This is the tab that matters most. Log even a $5 sample sale — it's your first real data point." />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-xs text-stone-500 uppercase tracking-wide">
              <tr>
                <th className="text-left py-3 px-4">Date</th>
                <th className="text-left py-3 px-4">Channel</th>
                <th className="text-left py-3 px-4">Crop</th>
                <th className="text-left py-3 px-4">Qty</th>
                <th className="text-left py-3 px-4">Unit</th>
                <th className="text-right py-3 px-4">Price</th>
                <th className="text-right py-3 px-4">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {sales.map((s) => (
                <tr key={s.id}>
                  <td className="py-2.5 px-4 text-stone-500">{s.sale_date}</td>
                  <td className="py-2.5 px-4 font-medium text-stone-700">{channelMap[s.channel_id] ?? s.customer_name ?? "—"}</td>
                  <td className="py-2.5 px-4 text-stone-500">{cropMap[s.crop_id] ?? "—"}</td>
                  <td className="py-2.5 px-4">{s.quantity}</td>
                  <td className="py-2.5 px-4 text-stone-500">{s.unit}</td>
                  <td className="py-2.5 px-4 text-right">{fmtCurrency2(s.unit_price)}</td>
                  <td className="py-2.5 px-4 text-right font-medium">{fmtCurrency2(s.total_revenue ?? s.quantity * s.unit_price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
