"use client";

import { useState } from "react";
import { fmtCurrency2 } from "@/components/ui";

type Row = { year: number; category: string; source: string; total_amount: number };

export default function TaxSummarySection({ rows, agTaxExempt }: { rows: Row[]; agTaxExempt: boolean }) {
  const [exporting, setExporting] = useState(false);
  const total = rows.reduce((a, r) => a + (r.total_amount ?? 0), 0);

  function escape(v: string) {
    return `"${String(v).replace(/"/g, '""')}"`;
  }

  function exportCsv() {
    setExporting(true);
    try {
      const lines = [
        "year,category,source,total",
        ...rows.map((r) => [r.year, escape(r.category), escape(r.source), r.total_amount].join(",")),
      ];
      const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tax-deductible-summary-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-stone-800">Tax write-offs</h3>
          <p className="text-xs text-stone-400 mt-0.5">
            Purchases and labor flagged tax-deductible, by year and category.
            {agTaxExempt ? " Your farm is marked as holding an ag tax exemption (set in Settings)." : ""}
          </p>
        </div>
        {rows.length > 0 && (
          <button className="btn-secondary !py-1.5 text-sm whitespace-nowrap" onClick={exportCsv} disabled={exporting}>
            {exporting ? "Exporting…" : "Export CSV"}
          </button>
        )}
      </div>
      {rows.length === 0 ? (
        <div className="px-5 py-4">
          <p className="text-sm text-stone-400">No tax-deductible purchases or labor logged yet.</p>
        </div>
      ) : (
        <>
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-xs text-stone-500 uppercase tracking-wide">
              <tr>
                <th className="text-left py-3 px-4">Year</th>
                <th className="text-left py-3 px-4">Category</th>
                <th className="text-left py-3 px-4">Source</th>
                <th className="text-right py-3 px-4">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {rows.map((r, i) => (
                <tr key={`${r.year}-${r.category}-${r.source}-${i}`}>
                  <td className="py-2.5 px-4 text-stone-500">{r.year}</td>
                  <td className="py-2.5 px-4 font-medium text-stone-700">{r.category}</td>
                  <td className="py-2.5 px-4 text-stone-500 capitalize">{r.source}</td>
                  <td className="py-2.5 px-4 text-right font-medium">{fmtCurrency2(r.total_amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-5 py-3 border-t border-stone-100 text-sm text-stone-600">
            Total tax-deductible: <span className="font-semibold text-stone-800">{fmtCurrency2(total)}</span>
          </div>
        </>
      )}
    </div>
  );
}
