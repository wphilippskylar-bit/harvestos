"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { DEMO_MODE } from "@/lib/demo-mode";
import { errorMessage } from "@/lib/errors";
import { downloadCsv } from "@/lib/csv";
import { IMPORT_CONFIGS } from "@/lib/import-configs";

// Reuses the same field configs as the Import feature (lib/import-configs.ts) so the two are
// symmetric — a file exported here matches the column layout the importer already knows how to
// read back in, useful for backups or moving data between orgs.

export default function ExportClient({ orgId, orgName }: { orgId: string; orgName: string }) {
  const supabase = createClient();
  const [configKey, setConfigKey] = useState(IMPORT_CONFIGS[0].key);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastExportCount, setLastExportCount] = useState<number | null>(null);

  const config = IMPORT_CONFIGS.find((c) => c.key === configKey)!;

  async function runExport() {
    setExporting(true);
    setError(null);
    setLastExportCount(null);
    try {
      if (DEMO_MODE) throw new Error("Export is disabled in demo mode.");
      const columns = config.fields.map((f) => f.key).join(",");
      const { data, error } = await supabase.from(config.table).select(columns).eq("org_id", orgId);
      if (error) throw error;
      const rows = (data ?? []).map((row: any) => config.fields.map((f) => row[f.key] ?? ""));
      const safeOrgName = (orgName || "harvest-os").toLowerCase().replace(/[^a-z0-9]+/g, "-");
      downloadCsv(
        `${safeOrgName}-${config.key}-${new Date().toISOString().slice(0, 10)}.csv`,
        config.fields.map((f) => f.label),
        rows
      );
      setLastExportCount(rows.length);
    } catch (err) {
      setError(errorMessage(err, "Could not export"));
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="card p-5 max-w-lg">
      <label className="label">What do you want to export?</label>
      <select className="input" value={configKey} onChange={(e) => { setConfigKey(e.target.value); setLastExportCount(null); setError(null); }}>
        {IMPORT_CONFIGS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
      </select>
      <p className="text-xs text-stone-400 mt-2">
        Downloads every {config.label.toLowerCase()} record in your farm as a CSV, with the same
        columns the Import feature uses — useful for backups, or moving data to another tool.
      </p>
      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
      {lastExportCount != null && !error && (
        <p className="text-sm text-emerald-700 mt-2">Downloaded {lastExportCount} row{lastExportCount === 1 ? "" : "s"}.</p>
      )}
      <div className="flex justify-end mt-4">
        <button className="btn-primary" onClick={runExport} disabled={exporting}>
          {exporting ? "Exporting…" : "Download CSV"}
        </button>
      </div>
    </div>
  );
}
