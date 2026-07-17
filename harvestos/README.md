# Harvest OS

A standalone farm operations app for Aiyahuta Craft Farm — batches, purchases, sales, sales-channel
pipeline, environment logs, and goals, with live-computed charts and P&L. Built with Next.js 14
(App Router) and Supabase (Postgres + Auth + Row Level Security).

It's built multi-tenant from day one (organizations + role-based memberships) so it can later be
sold as a licensed product to other farms without a schema rewrite — but today it runs as your own
private, single-farm app with no one else's data anywhere near it.

## What's in here

- `app/` — pages (Dashboard, Batches, Purchases, Sales, Sales Channels, Crop Library, Environment
  Log, Goals, Settings, Login)
- `components/` — shared UI, charts (Recharts), and forms
- `lib/` — Supabase client helpers, data-fetching functions, demo-mode data
- `supabase/migrations/` — the full database schema, run these in order in your Supabase project
- `middleware.ts` — auth gating (redirects signed-out users to `/login`)

## Try it instantly with no setup (demo mode)

You can run the app locally against realistic mock data with zero backend setup:

```bash
npm install
cp .env.example .env.local
# edit .env.local and set NEXT_PUBLIC_DEMO_MODE=true
npm run dev
```

Open `http://localhost:3000`. Everything is clickable, but nothing you type is saved — it's for
getting a feel of the UI before connecting a real database.

## Connecting your own free Supabase project (real data, your farm only)

Nothing in this codebase includes real credentials — you'll create your own free accounts and
connect them yourself. Here's the whole path, roughly 15 minutes:

### 1. Create the Supabase project

1. Go to [supabase.com](https://supabase.com) and sign up (free tier is plenty for one farm).
2. Click **New project**. Pick any name (e.g. `harvest-os`), a strong database password (save it
   somewhere — you likely won't need it again, but Supabase asks), and the region closest to you.
3. Wait ~2 minutes for it to provision.

### 2. Run the database migrations

1. In your new project, open the **SQL Editor** (left sidebar).
2. Open `supabase/migrations/0001_init.sql` from this codebase, copy its entire contents, paste
   into a new SQL Editor query, and click **Run**.
3. Repeat for `0002_seed_demo.sql`, then `0003_invites.sql`, then `0004_org_members_rpc.sql` —
   **in that exact order**, each as its own run. (They build on each other; running out of order
   will error.)
4. If a run errors, read the message — it's almost always "already exists" from re-running a step
   twice, which is safe to ignore, or a typo from copy/paste truncation. Re-copy the full file if
   unsure.

### 3. Get your API keys

1. In Supabase, go to **Project Settings → API**.
2. Copy the **Project URL** and the **anon / public** key (not the `service_role` key — that one
   should never leave Supabase's dashboard).

### 4. Configure the app

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
NEXT_PUBLIC_DEMO_MODE=false
```

### 5. Run it locally against your real database

```bash
npm install
npm run dev
```

Open `http://localhost:3000`, click **Create account**, enter your farm name, email, and a
password. That first signup automatically becomes the **owner** and seeds your farm with your real
13 crops and your verified restaurant/market list (from `0002_seed_demo.sql`) — you don't need to
re-enter any of that by hand.

## Deploying so you can use it from your phone

Once it works locally, put it on Vercel (also free) so you have a real URL you can open from
anywhere:

1. Push this codebase to a GitHub repository (private is fine).
2. Go to [vercel.com](https://vercel.com), sign up with GitHub, click **Add New → Project**, and
   import that repo.
3. In the import screen, expand **Environment Variables** and add the same three from your
   `.env.local`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `NEXT_PUBLIC_DEMO_MODE=false`.
4. Click **Deploy**. A couple minutes later you'll have a live `https://your-app.vercel.app` URL —
   bookmark it on your phone's home screen and it behaves like an app.

Every time you push a change to the repo, Vercel rebuilds and redeploys automatically.

## Giving Victoria (or anyone else) access

Once you're signed in, go to **Settings**. Under "Invite someone," enter their email and pick a
role — **Member** if they should log batches/sales/purchases, **Viewer** if they should only look,
**Admin** if they should also be able to manage the team and settings (but not delete the farm or
change billing — that stays owner-only). Click **Invite**.

There's no email service wired up — instead, the moment that person creates an account (or logs
in, if they already have one) using that exact email address, they're automatically dropped into
your farm at the role you picked. No separate acceptance step. You can revoke a pending invite
from the same Settings screen before they accept it, or remove/change someone's role afterward.

## The "console" — Goals tab

You asked for a goal-tracker rather than an AI assistant, so that's exactly what it is: you set a
target (revenue, trays/week, accounts landed, take-home per month, or a custom metric) and a
target date, and update your current progress whenever you check in. No AI, no autonomous
behavior — you're always the one driving it.

## Batch IDs

On the Batches page, "Add batch" has a **Generate** button that calls a database function
(`next_batch_id`) to produce an ID like `ACF-20260716-001` (prefix–date–sequence, reset daily). You
can also type your own ID directly, or edit a generated one before saving. The prefix (`ACF` by
default) is editable in Settings.

## About the future paid tiers

You mentioned eventually licensing this to other farms at $15 (≤10 seats), $30 (11–25 seats), and
$55 (26–50 seats). The database already has `plan_tier` and `seat_limit` columns on
`organizations` for exactly this, and the whole app is multi-tenant (every table is scoped to an
org with row-level security), so adding billing later is additive — it won't require touching the
schema or rewriting the app. Billing itself (Stripe integration, tier enforcement, a
marketing/signup page for other farms) is intentionally not built yet, per your "MVP first, iterate"
call — happy to build that phase whenever you're ready for it.

## A couple of honest notes

- **Security patch**: this was built against Next.js 14.2, and pinned here to `14.2.35` (the latest
  patch on that line) which fixes the great majority of known Next.js advisories without any
  breaking changes. Next 15/16 exist and fix a couple more, but upgrading is a bigger jump (some
  App Router APIs changed) — worth doing eventually, not urgent for a single-farm private app.
- **Demo mode is a preview only** — nothing typed there is saved anywhere, by design, so you can
  explore safely before your real Supabase project is connected.
- The "Crop Library" protocol fields (soak time, blackout days, watering schedule, etc.) come from
  your real tracking sheet via the seed migration — once your Supabase project is running, that
  page will be fully populated, not just the shortened demo version.
