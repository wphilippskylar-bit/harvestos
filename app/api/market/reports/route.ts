import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Proxies USDA's free MyMarketNews (MARS) API report listing. Server-side only, for two reasons:
// (1) the API key is a secret that must never reach the browser, and (2) USDA's own docs say the
// MARS API "does not support open web browser calls" — it has to be called from a server.
// Requires USDA_MARS_API_KEY (a free USDA eAuth account + API key, see README).

const MARS_BASE = "https://marsapi.ams.usda.gov/services/v1.2";

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

  const q = request.nextUrl.searchParams.get("q") || "";
  const url = q
    ? `${MARS_BASE}/reports?q=commodity=${encodeURIComponent(q)}`
    : `${MARS_BASE}/reports`;

  try {
    const auth = Buffer.from(`${apiKey}:`).toString("base64");
    const res = await fetch(url, { headers: { Authorization: `Basic ${auth}` }, next: { revalidate: 3600 } });
    if (!res.ok) {
      return NextResponse.json({ error: `USDA API returned an error (${res.status})` }, { status: 502 });
    }
    const data = await res.json();
    const reports = (Array.isArray(data) ? data : []).map((r: any) => ({
      slug_id: r.slug_id,
      report_title: r.report_title,
      market_types: r.market_types,
      office_name: r.office_name,
      office_city: r.office_city,
      office_state: r.office_state,
    }));
    return NextResponse.json({ reports });
  } catch {
    return NextResponse.json({ error: "Could not reach USDA's market data service." }, { status: 502 });
  }
}
