// Unit-preference helpers (migration 0022). Every org picks how they want weight and field/area
// size DISPLAYED — microgreens growers live in ounces, most everyone else thinks in pounds; some
// growers think in acres, others (especially small/urban/CEA growers) think in square feet.
// To keep every existing table/query simple, we don't change what's stored on disk: weight stays
// stored in whatever unit the record's own `*_unit` column says (already the case everywhere —
// crops.oz_per_tray, cea_plantings.yield_unit, etc.), and field/area size stays stored in a fixed
// canonical unit per table (fields.size_acres in acres, cea_areas.sq_ft in square feet). These
// helpers convert canonical stored values to/from the org's preferred display unit, and convert
// a preferred-unit form input back to canonical before saving.

export type WeightUnit = "lb" | "oz";
export type AreaUnit = "acres" | "sq_ft";

const OZ_PER_LB = 16;
const SQ_FT_PER_ACRE = 43560;

export function lbToOz(lb: number): number {
  return lb * OZ_PER_LB;
}
export function ozToLb(oz: number): number {
  return oz / OZ_PER_LB;
}
export function acresToSqFt(acres: number): number {
  return acres * SQ_FT_PER_ACRE;
}
export function sqFtToAcres(sqFt: number): number {
  return sqFt / SQ_FT_PER_ACRE;
}

// fields.size_acres is stored in acres — convert to whichever unit the org prefers, for display.
export function acresToPreferred(acres: number | null, areaUnit: AreaUnit): number | null {
  if (acres == null) return null;
  return areaUnit === "sq_ft" ? acresToSqFt(acres) : acres;
}
// Convert a form input given in the org's preferred unit back to acres for storage.
export function preferredToAcres(value: number, areaUnit: AreaUnit): number {
  return areaUnit === "sq_ft" ? sqFtToAcres(value) : value;
}

// cea_areas.sq_ft is stored in square feet — convert to whichever unit the org prefers, for display.
export function sqFtToPreferred(sqFt: number | null, areaUnit: AreaUnit): number | null {
  if (sqFt == null) return null;
  return areaUnit === "acres" ? sqFtToAcres(sqFt) : sqFt;
}
// Convert a form input given in the org's preferred unit back to square feet for storage.
export function preferredToSqFt(value: number, areaUnit: AreaUnit): number {
  return areaUnit === "acres" ? acresToSqFt(value) : value;
}

export function areaUnitLabel(areaUnit: AreaUnit): string {
  return areaUnit === "sq_ft" ? "sq ft" : "acres";
}
export function weightUnitLabel(weightUnit: WeightUnit): string {
  return weightUnit === "oz" ? "oz" : "lb";
}

// A sensible default weight unit for a NEW record's own unit dropdown (e.g. a planting's yield
// unit) — respects the org's overall preference, so most growers don't have to touch the dropdown.
export function defaultWeightUnit(orgWeightUnit?: string | null): WeightUnit {
  return orgWeightUnit === "oz" ? "oz" : "lb";
}
export function defaultAreaUnit(orgAreaUnit?: string | null): AreaUnit {
  return orgAreaUnit === "sq_ft" ? "sq_ft" : "acres";
}
