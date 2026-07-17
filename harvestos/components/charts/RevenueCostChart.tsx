"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";

export type WeeklyPoint = { label: string; revenue: number; cost: number };

export default function RevenueCostChart({ data }: { data: WeeklyPoint[] }) {
  if (data.length === 0) {
    return <div className="h-64 flex items-center justify-center text-sm text-stone-400">No sales or purchases logged yet — this chart fills in as you enter data.</div>;
  }
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} barGap={2} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#78716c" }} axisLine={{ stroke: "#e7e5e4" }} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "#78716c" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} width={48} />
        <Tooltip
          formatter={(value: number) => [`$${value.toFixed(0)}`, ""]}
          contentStyle={{ borderRadius: 10, border: "1px solid #e7e5e4", fontSize: 12 }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="revenue" name="Revenue" fill="#2a78d6" radius={[4, 4, 0, 0]} />
        <Bar dataKey="cost" name="Cost" fill="#eda100" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
