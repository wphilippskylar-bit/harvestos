"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, LabelList } from "recharts";

export type CropCostPoint = { crop: string; costPerTray: number; premium: boolean };

export default function CropMarginChart({ data }: { data: CropCostPoint[] }) {
  if (data.length === 0) {
    return <div className="h-64 flex items-center justify-center text-sm text-stone-400">Add crops to your library to see cost-per-tray comparisons.</div>;
  }
  const sorted = [...data].sort((a, b) => a.costPerTray - b.costPerTray);
  return (
    <ResponsiveContainer width="100%" height={Math.max(220, sorted.length * 34)}>
      <BarChart data={sorted} layout="vertical" margin={{ top: 4, right: 36, left: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11, fill: "#78716c" }} axisLine={{ stroke: "#e7e5e4" }} tickLine={false} tickFormatter={(v) => `$${v}`} />
        <YAxis type="category" dataKey="crop" tick={{ fontSize: 11.5, fill: "#44403c" }} axisLine={false} tickLine={false} width={150} />
        <Tooltip formatter={(value: number) => [`$${value.toFixed(2)}/tray`, "Cost"]} contentStyle={{ borderRadius: 10, border: "1px solid #e7e5e4", fontSize: 12 }} />
        <Bar dataKey="costPerTray" radius={[0, 4, 4, 0]} barSize={16}>
          {sorted.map((d, i) => (
            <Cell key={i} fill={d.premium ? "#9C6B1E" : "#1F4E2E"} />
          ))}
          <LabelList dataKey="costPerTray" position="right" formatter={(v: number) => `$${v.toFixed(2)}`} style={{ fontSize: 11, fill: "#57534e" }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
