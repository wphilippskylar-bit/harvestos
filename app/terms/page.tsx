import Link from "next/link";

// Beta-stage Terms of Use — plain-language, not a lawyer-drafted contract. Per the go-to-market
// roadmap, that's intentional: this is the minimum legal cover appropriate before inviting people
// outside Phil's own circle into a free beta, not the real customer agreement that should get a
// lawyer's eyes once billing exists and real money changes hands (see Phase 3 of the roadmap).

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-stone-50 px-4 py-12">
      <div className="max-w-2xl mx-auto">
        <Link href="/login" className="text-sm text-brand-700 hover:underline">← Back</Link>
        <div className="card p-8 mt-4">
          <h1 className="text-2xl font-extrabold text-stone-900 mb-1">Terms of Use</h1>
          <p className="text-xs text-stone-400 mb-6">Beta version — last updated July 2026.</p>

          <div className="space-y-5 text-sm text-stone-700 leading-relaxed">
            <p>
              Harvest OS is currently in beta. That means it&apos;s free to use, it&apos;s actively
              being developed, and features, pricing, and these terms may change as it matures into
              a finished product. By creating an account, you&apos;re agreeing to use it as-is,
              understanding that it&apos;s a work in progress.
            </p>

            <section>
              <h2 className="font-semibold text-stone-800 mb-1">What you&apos;re getting</h2>
              <p>
                Harvest OS gives your farm or business its own private workspace (an
                &quot;organization&quot;) for tracking crops, livestock, sales, purchases, and
                related farm operations. Free during the beta period — no payment is collected or
                required to use it right now.
              </p>
            </section>

            <section>
              <h2 className="font-semibold text-stone-800 mb-1">Your data stays yours, and stays separate</h2>
              <p>
                Each organization&apos;s data is private to that organization and the people you
                invite to it. Other Harvest OS users cannot see your farm&apos;s data, and you
                cannot see theirs. We don&apos;t sell or share your business data with third
                parties.
              </p>
            </section>

            <section>
              <h2 className="font-semibold text-stone-800 mb-1">Beta software means things may change or break</h2>
              <p>
                Because this is beta software, expect occasional bugs, changes to how features work,
                and the possibility that a feature you rely on today gets reworked. We&apos;ll do
                our best to avoid data loss, but during beta you shouldn&apos;t treat Harvest OS as
                your only copy of critical records — keep your own backups or exports of anything
                you can&apos;t afford to lose.
              </p>
            </section>

            <section>
              <h2 className="font-semibold text-stone-800 mb-1">No warranty</h2>
              <p>
                Harvest OS is provided &quot;as is,&quot; without warranties of any kind, during the
                beta period. We&apos;re not liable for losses arising from bugs, downtime, or data
                issues in this beta phase. If you&apos;re using Harvest OS to run financial,
                regulatory, or compliance records for your business, use your own judgment about
                what to also keep elsewhere until the product is out of beta.
              </p>
            </section>

            <section>
              <h2 className="font-semibold text-stone-800 mb-1">Account & data deletion</h2>
              <p>
                You can request deletion of your organization&apos;s account and data at any time by
                contacting us (see below). We&apos;ll remove your data within a reasonable time of
                that request.
              </p>
            </section>

            <section>
              <h2 className="font-semibold text-stone-800 mb-1">Questions or feedback</h2>
              <p>
                This beta exists to get real feedback from real farms. If something&apos;s
                confusing, broken, or missing, we want to hear about it — see the feedback link on
                the login page, or reach out directly.
              </p>
            </section>

            <p className="text-xs text-stone-400 pt-2 border-t border-stone-100">
              This is a plain-language beta agreement, not a substitute for legal advice. It will be
              replaced with a formal Terms of Service once Harvest OS moves out of beta and paid
              plans are introduced.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
