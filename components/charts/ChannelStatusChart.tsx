"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, LabelList } from "recharts";

const ORDER = ["untried", "attempted", "in_progress", "active"] as const;
const LABELS: Record<string, string> = { untried: "Untried", attempted: "Attempted", in_progress: "In Progress", active: "Active" };
const COLORS: Record<string, string> = { untried: "#a8a29e", attempted: "#eda100", in_progress: "#2a78d6", active: "#008300" };

export default function ChannelStatusChart({ counts }: { counts: Record<string, number> }) {
  const data = ORDER.map((k) => ({ status: LABELS[k], key: k, count: counts[k] ?? 0 }));
  const total = data.reduce((a, d) => a + d.count, 0);
  if (total === 0) {
    return <div className="h-56 flex items-center justify-center text-sm text-stone-400">Add sales channels to see your pipeline.</div>;
  }
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 20, right: 8, left: -8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" vertical={false} />
        <XAxis dataKey="status" tick={{ fontSize: 11.5, fill: "#44403c" }} axisLine={{ stroke: "#e7e5e4" }} tickLine={false} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#78716c" }} axisLine={false} tickLine={false} width={28} />
        <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #e7e5e4", fontSize: 12 }} />
        <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={44}>
          {data.map((d) => (
            <Cell key={d.key} fill={COLORS[d.key]} />
          ))}
          <LabelList dataKey="count" position="top" style={{ fontSize: 12, fontWeight: 700, fill: "#44403c" }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
