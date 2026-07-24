import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Proxies NOAA's National Weather Service API (api.weather.gov) — completely free, no API key,
// no signup, US-only (which is fine, Harvest OS's fields are US farm locations). NOAA does require
// a descriptive User-Agent identifying the app (their docs ask for an app name + contact), so this
// stays server-side both for that and to keep the two-step lookup (points → forecast URL) off the
// client. Given a lat/lng, returns the next several forecast periods (day/night alternating),
// which is enough to compute frost/freeze risk without needing anything paid.

const USER_AGENT = "HarvestOS (farm management app), contact via app support";

export async function GET(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const lat = request.nextUrl.searchParams.get("lat");
  const lng = request.nextUrl.searchParams.get("lng");
  if (!lat || !lng) {
    return NextResponse.json({ error: "lat and lng are required" }, { status: 400 });
  }

  try {
    const pointsRes = await fetch(`https://api.weather.gov/points/${lat},${lng}`, {
      headers: { "User-Agent": USER_AGENT },
      next: { revalidate: 3600 }, // grid point for a location never changes — cache an hour is plenty
    });
    if (!pointsRes.ok) {
      // NOAA only covers US locations — a 404 here usually just means the field is outside the US.
      return NextResponse.json({ error: "No NOAA forecast available for this location." }, { status: 404 });
    }
    const points = await pointsRes.json();
    const forecastUrl = points?.properties?.forecast;
    if (!forecastUrl) {
      return NextResponse.json({ error: "No NOAA forecast available for this location." }, { status: 404 });
    }

    const forecastRes = await fetch(forecastUrl, {
      headers: { "User-Agent": USER_AGENT },
      next: { revalidate: 1800 }, // NOAA updates forecasts roughly hourly; 30 min is a reasonable cache
    });
    if (!forecastRes.ok) {
      return NextResponse.json({ error: "Could not reach NOAA's forecast service." }, { status: 502 });
    }
    const forecast = await forecastRes.json();
    const periods = (forecast?.properties?.periods ?? []).slice(0, 14).map((p: any) => ({
      name: p.name,
      startTime: p.startTime,
      isDaytime: p.isDaytime,
      temperature: p.temperature,
      temperatureUnit: p.temperatureUnit,
      shortForecast: p.shortForecast,
    }));

    return NextResponse.json({ periods });
  } catch {
    return NextResponse.json({ error: "Could not reach NOAA's weather service." }, { status: 502 });
  }
}
