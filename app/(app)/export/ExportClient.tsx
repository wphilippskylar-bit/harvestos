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

// The acreage report is deliberately NOT one of IMPORT_CONFIGS — it's derived data (a join across
// plantings + fields, formatted to match FSA-578), not a straight table dump, so it needs its own
// query. Listed first in the dropdown and flagged "Premium" — this is the feature tied to the
// Grower tier and up once billing exists (see Settings pricing discussion), not a free-tier item.
const ACREAGE_REPORT_KEY = "acreage_report";

export default function ExportClient({ orgId, orgName }: { orgId: string; orgName: string }) {
  const supabase = createClient();
  const [configKey, setConfigKey] = useState(ACREAGE_REPORT_KEY);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastExportCount, setLastExportCount] = useState<number | null>(null);

  const isAcreageReport = configKey === ACREAGE_REPORT_KEY;
  const config = IMPORT_CONFIGS.find((c) => c.key === configKey);

  const INTENDED_USE_LABELS: Record<string, string> = {
    grain: "Grain", feed: "Feed", seed: "Seed", cover_crop: "Cover crop",
    forage: "Forage", fresh_market: "Fresh market", processing: "Processing", other: "Other",
  };

  async function runAcreageExport() {
    const { data, error } = await supabase
      .from("plantings")
      .select("crop_name_snapshot, planted_date, intended_use, producer_share_pct, fields(name, size_acres), field_rows(label)")
      .eq("org_id", orgId)
      .order("planted_date", { ascending: false });
    if (error) throw error;
    const rows = (data ?? []).map((p: any) => [
      p.crop_name_snapshot ?? "",
      p.fields?.name ?? "",
      p.field_rows?.label ?? "",
      p.fields?.size_acres != null ? String(p.fields.size_acres) : "",
      p.planted_date,
      p.intended_use ? (INTENDED_USE_LABELS[p.intended_use] ?? p.intended_use) : "",
      p.producer_share_pct != null ? String(p.producer_share_pct) : "",
    ]);
    const safeOrgName = (orgName || "harvest-os").toLowerCase().replace(/[^a-z0-9]+/g, "-");
    downloadCsv(
      `${safeOrgName}-acreage-report-${new Date().toISOString().slice(0, 10)}.csv`,
      ["Crop", "Field", "Row/section", "Acres (field total)", "Planted date", "Intended use", "Producer share %"],
      rows
    );
    return rows.length;
  }

  async function runExport() {
    setExporting(true);
    setError(null);
    setLastExportCount(null);
    try {
      if (DEMO_MODE) throw new Error("Export is disabled in demo mode.");
      if (isAcreageReport) {
        setLastExportCount(await runAcreageExport());
        return;
      }
      if (!config) throw new Error("Pick what to export.");
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
        <option value={ACREAGE_REPORT_KEY}>★ Acreage report (FSA-578 style) — Premium</option>
        {IMPORT_CONFIGS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
      </select>
      <p className="text-xs text-stone-400 mt-2">
        {isAcreageReport
          ? "Every planting on record — crop, field, acres, planted date, intended use, and producer share — formatted to match what an FSA-578 filing or crop insurance agent asks for. (Also available with date-range filtering on the Compliance page.)"
          : `Downloads every ${config?.label.toLowerCase()} record in your farm as a CSV, with the same columns the Import feature uses — useful for backups, or moving data to another tool.`}
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
