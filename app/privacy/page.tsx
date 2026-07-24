import Link from "next/link";

// Beta-stage Privacy Policy — companion to /terms. Same "plain-language, appropriate for a free
// beta, not a final legal document" scope.

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-stone-50 px-4 py-12">
      <div className="max-w-2xl mx-auto">
        <Link href="/login" className="text-sm text-brand-700 hover:underline">← Back</Link>
        <div className="card p-8 mt-4">
          <h1 className="text-2xl font-extrabold text-stone-900 mb-1">Privacy Policy</h1>
          <p className="text-xs text-stone-400 mb-6">Beta version — last updated July 2026.</p>

          <div className="space-y-5 text-sm text-stone-700 leading-relaxed">
            <p>
              This page explains what data Harvest OS collects, how it&apos;s used, and who can see
              it, in plain language.
            </p>

            <section>
              <h2 className="font-semibold text-stone-800 mb-1">What we collect</h2>
              <p>
                Your account email and password (handled securely by our authentication provider —
                we never see or store your plaintext password). Whatever farm/business data you
                choose to enter: crops, batches, fields, animals, purchases, sales, labor entries,
                and similar records. If you enable push notifications, your device&apos;s push
                subscription so we can send the alerts you asked for (like low-stock or harvest-due
                reminders). If you use the Market Prices feature, your searches are sent to USDA&apos;s
                public API to fetch commodity pricing — no personal data is sent to USDA beyond the
                search term itself.
              </p>
            </section>

            <section>
              <h2 className="font-semibold text-stone-800 mb-1">Who can see your data</h2>
              <p>
                Only people you&apos;ve invited to your organization, with the role you assign them
                (owner, admin, member, or viewer). Your data is never visible to other Harvest OS
                organizations. We (the people building Harvest OS) can access data only as needed
                to operate the service, debug an issue you&apos;ve reported, or as required by law
                — not for any other purpose, and never sold to third parties.
              </p>
            </section>

            <section>
              <h2 className="font-semibold text-stone-800 mb-1">Where your data lives</h2>
              <p>
                Harvest OS is built on Supabase (a hosted Postgres database and authentication
                provider) and deployed on Vercel. Both are established infrastructure providers used
                by many applications; your data is stored in their systems on Harvest OS&apos;s
                behalf, protected by database-level access rules that keep your organization&apos;s
                data isolated from every other organization&apos;s.
              </p>
            </section>

            <section>
              <h2 className="font-semibold text-stone-800 mb-1">Third-party services we call</h2>
              <p>
                To provide certain features, Harvest OS makes requests to a small number of outside
                services: USDA&apos;s MyMarketNews API (commodity price data), NOAA&apos;s National
                Weather Service API (frost/freeze forecasts), and OpenStreetMap/Nominatim (map tiles
                and address search). These are all free, public government or open-data services —
                none of them receive your farm&apos;s private data, only the specific query needed
                for that feature (e.g. a commodity name, a set of coordinates, an address search
                term).
              </p>
            </section>

            <section>
              <h2 className="font-semibold text-stone-800 mb-1">Your choices</h2>
              <p>
                You can export or delete your data, or close your account entirely, at any time —
                contact us to request it. You can also turn off push notifications at any time from
                Settings.
              </p>
            </section>

            <p className="text-xs text-stone-400 pt-2 border-t border-stone-100">
              This is a plain-language beta privacy notice, not a substitute for legal advice. It
              will be replaced with a formal Privacy Policy once Harvest OS moves out of beta and
              handles paid customer billing data.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
