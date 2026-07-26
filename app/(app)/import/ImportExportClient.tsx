"use client";

import { useState } from "react";
import ImportClient from "./ImportClient";
import ExportClient from "../export/ExportClient";

const TABS = [
  { key: "export", label: "Export" },
  { key: "import", label: "Import" },
] as const;

export default function ImportExportClient({ orgId, orgName }: { orgId: string; orgName: string }) {
  // Export first — the acreage report (the premium item) lives there, and "download what I
  // already have" is the more common day-one action than "bring in an old spreadsheet."
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("export");

  return (
    <div>
      <div className="flex rounded-lg bg-stone-100 p-1 mb-4 text-sm font-medium max-w-xs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`flex-1 rounded-md py-1.5 transition-colors ${tab === t.key ? "bg-white shadow-sm text-brand-700" : "text-stone-500"}`}
            onClick={() => setTab(t.key)}
            type="button"
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === "export" ? <ExportClient orgId={orgId} orgName={orgName} /> : <ImportClient orgId={orgId} />}
    </div>
  );
}
