export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
      <div>
        <h1 className="text-2xl font-bold text-stone-900 tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-stone-500 mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

const STATUS_STYLES: Record<string, string> = {
  untried: "bg-stone-100 text-stone-600",
  attempted: "bg-amber-100 text-amber-700",
  in_progress: "bg-blue-100 text-blue-700",
  active: "bg-emerald-100 text-emerald-700",
  paused: "bg-stone-100 text-stone-500",
  planted: "bg-stone-100 text-stone-600",
  growing: "bg-blue-100 text-blue-700",
  harvested: "bg-emerald-100 text-emerald-700",
  sold_out: "bg-violet-100 text-violet-700",
  composted: "bg-stone-100 text-stone-400",
  hit: "bg-emerald-100 text-emerald-700",
  missed: "bg-red-100 text-red-700",
};

const STATUS_LABELS: Record<string, string> = {
  untried: "Untried",
  attempted: "Attempted",
  in_progress: "In Progress",
  active: "Active",
  paused: "Paused",
  planted: "Planted",
  growing: "Growing",
  harvested: "Harvested",
  sold_out: "Sold Out",
  composted: "Composted",
  hit: "Hit",
  missed: "Missed",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`badge ${STATUS_STYLES[status] ?? "bg-stone-100 text-stone-600"}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="card p-10 text-center">
      <p className="text-stone-600 font-medium">{title}</p>
      {hint && <p className="text-sm text-stone-400 mt-1">{hint}</p>}
    </div>
  );
}

export function fmtCurrency(n: number | null | undefined) {
  if (n === null || n === undefined) return "—";
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export function fmtCurrency2(n: number | null | undefined) {
  if (n === null || n === undefined) return "—";
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
}
