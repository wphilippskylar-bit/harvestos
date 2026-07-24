import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Proxies USDA's free MyMarketNews (MARS) API report listing. Server-side only, for two reasons:
// (1) the API key is a secret that must never reach the browser, and (2) USDA's own docs say the
// MARS API "does not support open web browser calls" — it has to be called from a server.
// Requires USDA_MARS_API_KEY (a free USDA eAuth account + API key, see README).
//
// USDA's own filtering docs only clearly document filtering *within* a single report's data rows
// (e.g. /reports/1095?q=commodity=Cheese) — not searching the /reports index itself by keyword.
// So instead of guessing at an unreliable list-filter parameter (which is what the earlier version
// of this route did, and why search results were often empty or wrong), this fetches the full
// report index once (cached — it doesn't change often) and does the keyword match here, against
// whatever text fields each report object actually has. That's slower on a cold cache but far more
// reliable than depending on undocumented server-side filtering behavior.

const MARS_BASE = "https://marsapi.ams.usda.gov/services/v1.2";

function reportTitle(r: any): string {
  return r.report_title || r.report_name || r.slug_name || `Report ${r.slug_id}`;
}

export async function GET(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const apiKey = process.env.USDA_MARS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Live market pricing isn't set up yet — add a free USDA API key to enable it (see README)." },
      { status: 501 }
    );
  }

  const q = (request.nextUrl.searchParams.get("q") || "").trim().toLowerCase();
  // Multi-word queries (e.g. "Fruits and Vegetables") were being matched as one exact phrase, but
  // USDA's actual report titles vary in wording — "Fruit & Vegetable", "Fruit and Vegetable"
  // (singular), etc. — so an exact-phrase substring match came back empty even though matching
  // reports exist. Split into words and require each word to appear somewhere in the haystack
  // (in any order), which is far more forgiving and matches how people actually search.
  const terms = q.split(/\s+/).filter(Boolean);

  try {
    const auth = Buffer.from(`${apiKey}:`).toString("base64");
    const res = await fetch(`${MARS_BASE}/reports`, {
      headers: { Authorization: `Basic ${auth}` },
      next: { revalidate: 21600 }, // report index rarely changes — cache 6h
    });
    if (!res.ok) {
      return NextResponse.json({ error: `USDA API returned an error (${res.status})` }, { status: 502 });
    }
    const data = await res.json();
    const all = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];

    const matched = terms.length > 0
      ? all.filter((r: any) => {
          const haystack = [
            r.report_title, r.report_name, r.slug_name, r.commodity,
            r.category, r.market_types, r.office_name, r.office_city, r.office_state,
          ]
            .filter(Boolean)
            .flat() // market_types may be an array
            .join(" ")
            .toLowerCase()
            .replace(/&/g, "and"); // normalize "Fruit & Vegetable" vs "Fruit and Vegetable"
          // Cheap singular/plural tolerance — "Fruits" should still match a title that says
          // "Fruit", and vice versa — without a full stemming library.
          return terms.every((t) => haystack.includes(t) || (t.endsWith("s") && t.length > 3 && haystack.includes(t.slice(0, -1))));
        })
      : all;

    const reports = matched.slice(0, 100).map((r: any) => ({
      slug_id: r.slug_id ?? r.slug_name,
      report_title: reportTitle(r),
      office_name: r.office_name ?? null,
      office_city: r.office_city ?? null,
      office_state: r.office_state ?? null,
    }));

    return NextResponse.json({ reports, totalAvailable: all.length });
  } catch {
    return NextResponse.json({ error: "Could not reach USDA's market data service." }, { status: 502 });
  }
}
