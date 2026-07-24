"use client";

import { useState } from "react";
import Papa from "papaparse";
import { createClient } from "@/lib/supabase/client";
import { DEMO_MODE } from "@/lib/demo-mode";
import { errorMessage } from "@/lib/errors";
import { IMPORT_CONFIGS, coerceValue, type ImportConfig } from "@/lib/import-configs";

type ParsedRow = Record<string, string>;

export default function ImportClient({ orgId }: { orgId: string }) {
  const supabase = createClient();
  const [configKey, setConfigKey] = useState(IMPORT_CONFIGS[0].key);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [fileName, setFileName] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ imported: number; failed: number; errors: string[] } | null>(null);

  const config = IMPORT_CONFIGS.find((c) => c.key === configKey) as ImportConfig;

  function resetFile() {
    setHeaders([]);
    setRows([]);
    setMapping({});
    setFileName(null);
    setParseError(null);
    setResult(null);
  }

  function handleFile(file: File) {
    resetFile();
    setFileName(file.name);
    Papa.parse<ParsedRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          setParseError(results.errors[0].message);
          return;
        }
        const detectedHeaders = results.meta.fields ?? [];
        setHeaders(detectedHeaders);
        setRows(results.data);
        // Best-effort auto-map: if a CSV column name matches a target field's key or label
        // (case-insensitive, ignoring spaces/underscores), pre-select it so most imports need
        // little to no manual mapping.
        const normalize = (s: string) => s.toLowerCase().replace(/[\s_]+/g, "");
        const autoMap: Record<string, string> = {};
        for (const field of config.fields) {
          const match = detectedHeaders.find(
            (h) => normalize(h) === normalize(field.key) || normalize(h) === normalize(field.label)
          );
          if (match) autoMap[field.key] = match;
        }
        setMapping(autoMap);
      },
      error: (err) => setParseError(err.message),
    });
  }

  function changeModule(key: string) {
    setConfigKey(key);
    resetFile();
  }

  const missingRequired = config.fields.filter(
    (f) => f.required && !mapping[f.key] && !(configKey === "batches" && f.key === "batch_id")
  );

  async function runImport() {
    if (DEMO_MODE) { setResult({ imported: 0, failed: 0, errors: ["Import is disabled in demo mode."] }); return; }
    setImporting(true);
    setResult(null);
    const errors: string[] = [];
    let imported = 0;
    let failed = 0;

    const toInsert: any[] = [];
    rows.forEach((row, i) => {
      const record: any = { org_id: orgId };
      let rowError: string | null = null;
      for (const field of config.fields) {
        const col = mapping[field.key];
        const raw = col ? row[col] ?? "" : "";
        const value = coerceValue(raw, field.type);
        if (field.required && value == null) {
          if (configKey === "batches" && field.key === "batch_id") {
            record.batch_id = `IMPORT-${i + 1}`;
            continue;
          }
          rowError = `Row ${i + 2}: missing required "${field.label}"`;
          break;
        }
        if (value != null) record[field.key] = value;
      }
      if (rowError) {
        failed++;
        if (errors.length < 20) errors.push(rowError);
      } else {
        toInsert.push(record);
      }
    });

    // Insert in chunks to stay well under Supabase's request-size limits on a large spreadsheet.
    const CHUNK = 200;
    for (let i = 0; i < toInsert.length; i += CHUNK) {
      const chunk = toInsert.slice(i, i + CHUNK);
      const { error } = await supabase.from(config.table).insert(chunk);
      if (error) {
        failed += chunk.length;
        if (errors.length < 20) errors.push(`Rows ${i + 1}-${i + chunk.length}: ${error.message}`);
      } else {
        imported += chunk.length;
      }
    }

    setResult({ imported, failed, errors });
    setImporting(false);
  }

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <label className="label">What are you importing?</label>
        <select className="input max-w-sm" value={configKey} onChange={(e) => changeModule(e.target.value)}>
          {IMPORT_CONFIGS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
        </select>

        <div className="mt-4">
          <label className="label">Upload CSV</label>
          <input
            className="input"
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          <p className="text-xs text-stone-400 mt-1">
            Export your existing spreadsheet as a CSV first (File → Download → CSV in Google Sheets, or Save As → CSV in Excel), then upload it here.
          </p>
        </div>
        {parseError && <p className="text-sm text-red-600 mt-2">Could not read that file: {parseError}</p>}
      </div>

      {fileName && headers.length > 0 && (
        <div className="card p-5">
          <h3 className="font-semibold text-stone-800 mb-1">Match your columns</h3>
          <p className="text-xs text-stone-400 mb-3">
            {fileName} — {rows.length} row{rows.length === 1 ? "" : "s"} detected. Match each Harvest OS field to a column from your file (or leave optional ones unmapped).
          </p>
          <div className="space-y-2">
            {config.fields.map((field) => (
              <div key={field.key} className="grid sm:grid-cols-2 gap-3 items-center">
                <label className="text-sm text-stone-700">
                  {field.label}
                  {field.required && configKey !== "batches" && <span className="text-red-500"> *</span>}
                  {field.hint && <span className="block text-xs text-stone-400">{field.hint}</span>}
                </label>
                <select
                  className="input"
                  value={mapping[field.key] ?? ""}
                  onChange={(e) => setMapping((m) => ({ ...m, [field.key]: e.target.value }))}
                >
                  <option value="">— Not mapped —</option>
                  {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            ))}
          </div>

          {missingRequired.length > 0 && (
            <p className="text-sm text-amber-600 mt-3">
              Still need to map: {missingRequired.map((f) => f.label).join(", ")}
            </p>
          )}

          {rows.length > 0 && (
            <div className="mt-4">
              <h4 className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">Preview (first 3 rows, as they'll be imported)</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-stone-400">
                      {config.fields.map((f) => <th key={f.key} className="pr-4 pb-1 whitespace-nowrap">{f.label}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 3).map((row, i) => (
                      <tr key={i} className="text-stone-600">
                        {config.fields.map((f) => {
                          const col = mapping[f.key];
                          const val = col ? row[col] : "";
                          return <td key={f.key} className="pr-4 py-1 whitespace-nowrap">{val || "—"}</td>;
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex justify-end mt-4">
            <button
              className="btn-primary"
              onClick={runImport}
              disabled={importing || rows.length === 0 || missingRequired.length > 0}
            >
              {importing ? "Importing…" : `Import ${rows.length} row${rows.length === 1 ? "" : "s"}`}
            </button>
          </div>

          {result && (
            <div className={`mt-4 p-3 rounded-lg text-sm ${result.failed > 0 ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-800"}`}>
              <p className="font-medium">
                Imported {result.imported} row{result.imported === 1 ? "" : "s"}
                {result.failed > 0 && `, ${result.failed} failed`}.
              </p>
              {result.errors.length > 0 && (
                <ul className="mt-1 list-disc list-inside text-xs space-y-0.5">
                  {result.errors.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
