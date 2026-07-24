"use client";

import { fmtCurrency2 } from "@/components/ui";

type Row = {
  asset_id: string;
  name: string;
  purchase_date: string;
  cost: number;
  salvage_value: number;
  useful_life_years: number;
  annual_depreciation: number;
  accumulated_depreciation: number;
  book_value: number;
};

export default function EquipmentSection({ rows }: { rows: Row[] }) {
  if (rows.length === 0) return null;

  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-4 border-b border-stone-100">
        <h3 className="font-semibold text-stone-800">Farm &amp; ranch equipment</h3>
        <p className="text-xs text-stone-400 mt-0.5">
          Straight-line depreciation, based on the salvage value and useful life you set when
          logging each equipment purchase.
        </p>
      </div>
      <table className="w-full text-sm">
        <thead className="bg-stone-50 text-xs text-stone-500 uppercase tracking-wide">
          <tr>
            <th className="text-left py-3 px-4">Item</th>
            <th className="text-left py-3 px-4">Purchased</th>
            <th className="text-right py-3 px-4">Cost</th>
            <th className="text-right py-3 px-4">Annual dep.</th>
            <th className="text-right py-3 px-4">Accum. dep.</th>
            <th className="text-right py-3 px-4">Book value</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {rows.map((r) => (
            <tr key={r.asset_id}>
              <td className="py-2.5 px-4 font-medium text-stone-700">{r.name}</td>
              <td className="py-2.5 px-4 text-stone-500">{r.purchase_date}</td>
              <td className="py-2.5 px-4 text-right">{fmtCurrency2(r.cost)}</td>
              <td className="py-2.5 px-4 text-right">{fmtCurrency2(r.annual_depreciation)}</td>
              <td className="py-2.5 px-4 text-right">{fmtCurrency2(r.accumulated_depreciation)}</td>
              <td className="py-2.5 px-4 text-right font-medium">{fmtCurrency2(r.book_value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
