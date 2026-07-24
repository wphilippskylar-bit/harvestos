// Stage 3 of Phil's "separate CEA / units / onboarding" request: when someone picks what they
// grow/ranch/herd during signup, offer to auto-pin the USDA market reports that actually apply to
// them, using the same search endpoint (and the same word-matching fix) as the Market Prices page.
// Best-effort by design — if USDA_MARS_API_KEY isn't configured yet, or a query comes back empty,
// we just skip it silently rather than blocking account creation on an optional nicety.

const OPERATION_TYPE_QUERIES: Record<string, string[]> = {
  livestock: ["Feeder Cattle", "Slaughter Cattle"],
  field_crop: ["Hay", "Specialty Crops"],
  cea: ["Specialty Crops"],
  // Microgreens don't have a dedicated USDA commodity report to pin — nothing to add here.
};

export async function autoPinMarketReports(supabase: any, orgId: string, operationTypes: string[]) {
  const queries = Array.from(new Set(operationTypes.flatMap((t) => OPERATION_TYPE_QUERIES[t] ?? [])));
  for (const q of queries) {
    try {
      const res = await fetch(`/api/market/reports?q=${encodeURIComponent(q)}`);
      if (!res.ok) continue;
      const data = await res.json();
      const top = data.reports?.[0];
      if (top?.slug_id) {
        const { error } = await supabase.from("market_watchlist").insert({
          org_id: orgId,
          report_slug: top.slug_id,
          report_title: top.report_title,
        });
        // Best-effort by design (this shouldn't block account creation), but a real insert failure
        // — RLS denial, a bad column, anything other than "no reports matched" — is worth knowing
        // about during development rather than disappearing into the same catch as "not configured".
        if (error) console.warn(`Could not auto-pin "${q}":`, error.message);
      }
    } catch (err) {
      // Market pricing likely isn't configured yet (no API key), or the network call itself
      // failed — safe to skip either way, but log it so it's not a total black box if something
      // else is actually wrong.
      console.warn(`Market auto-pin search for "${q}" failed:`, err);
    }
  }
}
