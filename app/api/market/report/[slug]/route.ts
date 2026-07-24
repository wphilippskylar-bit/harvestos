import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

const MARS_BASE = "https://marsapi.ams.usda.gov/services/v1.2";

// Fetches the current data rows for one USDA MARS report (a "report" is e.g. "National Feeder &
// Stocker Cattle Summary" — the actual columns vary a lot report to report, so the frontend renders
// whatever fields come back rather than assuming a fixed shape.
export async function GET(request: NextRequest, { params }: { params: { slug: string } }) {
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

  try {
    const auth = Buffer.from(`${apiKey}:`).toString("base64");
    const res = await fetch(`${MARS_BASE}/reports/${encodeURIComponent(params.slug)}`, {
      headers: { Authorization: `Basic ${auth}` },
      next: { revalidate: 900 },
    });
    if (!res.ok) {
      return NextResponse.json({ error: `USDA API returned an error (${res.status})` }, { status: 502 });
    }
    const data = await res.json();
    const results = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];
    return NextResponse.json({ results, stats: data?.stats ?? null });
  } catch {
    return NextResponse.json({ error: "Could not reach USDA's market data service." }, { status: 502 });
  }
}
