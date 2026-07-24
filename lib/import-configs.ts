// Config-driven CSV import — one entry per importable module. Each field maps to a real column on
// the target table; `required` means the column is NOT NULL with no default, so a row missing that
// value can't be inserted at all (skipped and counted as an error rather than silently guessing).
// `type` drives how a raw CSV string cell gets coerced before insert (numbers/booleans/dates all
// arrive from CSV as plain text). Kept intentionally to the columns a farmer migrating a tracking
// spreadsheet would actually have — not every column on each table (e.g. computed/generated
// columns like sales.total_revenue or purchases.total are never included, since the database fills
// those in itself and trying to import a value into them would just error).

export type ImportFieldType = "text" | "number" | "date" | "boolean";

export type ImportField = {
  key: string;
  label: string;
  required?: boolean;
  type?: ImportFieldType;
  hint?: string;
};

export type ImportConfig = {
  key: string;
  label: string;
  table: string;
  fields: ImportField[];
};

export const IMPORT_CONFIGS: ImportConfig[] = [
  {
    key: "crops",
    label: "Crops (Crop Library)",
    table: "crops",
    fields: [
      { key: "name", label: "Crop name", required: true },
      { key: "crop_family", label: "Crop family" },
      { key: "seed_cost_per_g", label: "Seed cost per gram", type: "number" },
      { key: "sow_rate_g", label: "Sow rate (g/tray)", type: "number" },
      { key: "oz_per_tray", label: "Oz per tray", type: "number" },
      { key: "oz_per_clamshell", label: "Oz per clamshell", type: "number" },
      { key: "packaging", label: "Packaging" },
      { key: "storage_temp", label: "Storage temp" },
      { key: "notes", label: "Notes" },
    ],
  },
  {
    key: "batches",
    label: "Batches (Microgreens)",
    table: "batches",
    fields: [
      { key: "batch_id", label: "Batch ID", required: true, hint: "Leave unmapped and we'll auto-number them (IMPORT-1, IMPORT-2, ...)" },
      { key: "crop_name_snapshot", label: "Crop name", required: true },
      { key: "tray_amount", label: "Tray amount", type: "number" },
      { key: "plant_date", label: "Plant date", type: "date" },
      { key: "harvest_date", label: "Harvest date", type: "date" },
      { key: "status", label: "Status", hint: "planted, growing, harvested, sold_out, or composted" },
      { key: "rack_location", label: "Rack/location" },
      { key: "notes", label: "Notes" },
    ],
  },
  {
    key: "fields",
    label: "Fields",
    table: "fields",
    fields: [
      { key: "name", label: "Field name", required: true },
      { key: "is_high_tunnel", label: "High tunnel / greenhouse?", type: "boolean" },
      { key: "size_acres", label: "Size (acres)", type: "number" },
    ],
  },
  {
    key: "animals",
    label: "Animals (Livestock)",
    table: "animals",
    fields: [
      { key: "ear_tag_number", label: "Ear tag / ID", required: true },
      { key: "breed", label: "Breed" },
      { key: "birth_date", label: "Birth date", type: "date" },
      { key: "status", label: "Status", hint: "active, sold, or deceased" },
      { key: "notes", label: "Notes" },
    ],
  },
  {
    key: "purchases",
    label: "Purchases",
    table: "purchases",
    fields: [
      { key: "item", label: "Item", required: true },
      { key: "purchase_date", label: "Purchase date", type: "date" },
      { key: "category", label: "Category", hint: "Seeds, Trays, Medium, Equipment, Supplies, Packaging, Rent, Utilities, Insurance, Marketing, or Other" },
      { key: "vendor", label: "Vendor" },
      { key: "amount_qty", label: "Amount/quantity (free text, e.g. \"5lbs\")" },
      { key: "cost", label: "Cost", type: "number" },
      { key: "tax", label: "Tax", type: "number" },
      { key: "shipping", label: "Shipping", type: "number" },
      { key: "reason", label: "Reason/notes" },
    ],
  },
  {
    key: "sales",
    label: "Sales",
    table: "sales",
    fields: [
      { key: "sale_date", label: "Sale date", type: "date" },
      { key: "customer_name", label: "Customer" },
      { key: "unit", label: "Unit", hint: "tray, oz, clamshell, lb, or live_tray" },
      { key: "quantity", label: "Quantity", type: "number" },
      { key: "unit_price", label: "Unit price", type: "number" },
      { key: "notes", label: "Notes" },
    ],
  },
];

export function coerceValue(raw: string, type: ImportFieldType | undefined): any {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  switch (type) {
    case "number": {
      const n = Number(trimmed.replace(/[$,]/g, ""));
      return Number.isNaN(n) ? null : n;
    }
    case "boolean":
      return ["true", "yes", "y", "1"].includes(trimmed.toLowerCase());
    case "date": {
      // Accept common spreadsheet date formats (MM/DD/YYYY, M/D/YY, YYYY-MM-DD) and normalize to
      // the ISO date string Postgres expects — most farm tracking sheets use US-style dates.
      const isoMatch = /^\d{4}-\d{2}-\d{2}$/.test(trimmed);
      if (isoMatch) return trimmed;
      const usMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
      if (usMatch) {
        const [, m, d, y] = usMatch;
        const year = y.length === 2 ? `20${y}` : y;
        return `${year}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
      }
      return trimmed; // let Postgres reject it with a clear error if it's some other format
    }
    default:
      return trimmed;
  }
}
