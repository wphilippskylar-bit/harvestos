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
3. Repeat for `0002_seed_demo.sql`, then `0003_invites.sql`, then `0004_org_members_rpc.sql`, then
   `0005_explicit_grants.sql`, then `0006_create_org_rpc.sql`, then `0007_crop_seed_cost_and_add.sql`,
   then `0008_inventory_and_batches.sql`, then `0009_inventory_edit_permissions.sql`, then
   `0010_push_and_harvest_photos.sql`, then `0011_field_crops.sql`, then `0012_livestock.sql`, then
   `0013_grazing.sql` — **in that exact order**, each as its own run. (They build on each other;
   running out of order will error.)
4. If a run errors, read the message — it's almost always "already exists" from re-running a step
   twice, which is safe to ignore, or a typo from copy/paste truncation. Re-copy the full file if
   unsure.

### About the checkboxes on the project-creation screen

Supabase's new-project form has a few security-related checkboxes. Here's what to do with each:

- **Enable Data API** — leave this **on**. The app talks to Supabase entirely through this API
  (there's no other way for it to read/write your data), so if it's off, nothing in the app will
  work at all.
- **Automatically expose new tables** (sometimes shown as "Default privileges for new entities") —
  either setting is fine here, and you can leave it at whatever Supabase defaults to. Normally,
  unchecking it is the safer choice, because it stops brand-new tables from being reachable over
  the API until you explicitly allow it. But `0005_explicit_grants.sql` already does that
  explicitly for every table this app uses — it grants access only to logged-in users
  (`authenticated`), never to the public (`anon`) — so the app works correctly either way, and nothing
  is accidentally left open.
- **Enable automatic RLS** (auto-enabling Row Level Security on tables you create later in the
  Table Editor) — leave this **on**. It's a good safety net for any table you might add yourself
  down the line. It doesn't affect anything from the migrations, since every table there already
  has RLS turned on explicitly with real policies attached.

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

## Phone features: installing it, camera photo-logging, and low-stock/harvest-due alerts

Harvest OS is a Progressive Web App (PWA) — no App Store/Play Store submission needed to get it on
your phone's home screen.

**Installing it**: open your deployed URL on your phone. On iPhone (Safari): tap the Share icon →
**Add to Home Screen**. On Android (Chrome): tap the **⋮** menu → **Install app** (or you'll see an
automatic "Add Harvest OS to Home screen" prompt). It opens full-screen from then on, no browser
address bar, just like a regular app.

**Camera photo-logging**: on the Batches page, the "Harvest" action now has an optional photo
field. On a phone this opens your camera directly (not a generic file picker) so you can snap a
photo of the harvest right as you weigh it. Photos are stored privately per-farm in a Supabase
Storage bucket (`harvest-photos`) — nobody outside your org can see them.

**Low-stock / harvest-due push notifications** (optional — a bit more setup, skip this if you just
want the app installed for now):

1. Generate a VAPID keypair (used to sign push messages): `npx web-push generate-vapid-keys`. This
   prints a public and private key.
2. In Vercel, go to your project → **Settings → Environment Variables** and add:
   - `NEXT_PUBLIC_VAPID_PUBLIC_KEY` — the public key from step 1
   - `VAPID_PRIVATE_KEY` — the private key from step 1 (keep this one secret)
   - `VAPID_SUBJECT` — `mailto:` plus an email address you control
   - `CRON_SECRET` — any random 16+ character string (e.g. `openssl rand -base64 24`)
   - `SUPABASE_SERVICE_ROLE_KEY` — from Supabase **Project Settings → API → service_role** key.
     This one is powerful (it bypasses all row-level security), which is exactly why it's only used
     server-side by the alert cron job — never put it in a `NEXT_PUBLIC_*` variable.
3. Redeploy (Vercel → Deployments → **Redeploy**, or just push a commit) so the new env vars take
   effect.
4. In the app, go to **Settings → Notifications** and click **Enable notifications on this device**
   — your browser will ask permission once.
5. `vercel.json` already schedules a daily check (`/api/push/send-alerts`, ~8am Central) that looks
   for low-stock crops and harvest-due batches across every farm and sends one summary push per
   farm to everyone who's enabled notifications there. Nothing further to configure — it starts
   working the next time the cron fires after you've completed steps 1–4. (Vercel's free Hobby tier
   allows one run per day for a given cron job, which is exactly the cadence this uses.)

## Giving a team member access

Once you're signed in, go to **Settings**. Under "Invite someone," enter their email and pick a
role — **Member** if they should log batches/sales/purchases, **Viewer** if they should only look,
**Admin** if they should also be able to manage the team and settings (but not delete the farm or
change billing — that stays owner-only). Click **Invite**.

There's no email service wired up — instead, the moment that person creates an account (or logs
in, if they already have one) using that exact email address, they're automatically dropped into
your farm at the role you picked. No separate acceptance step. You can revoke a pending invite
from the same Settings screen before they accept it, or remove/change someone's role afterward.

One extra nuance on the **Crop Library** specifically: any Member/Admin/Owner can add a new crop,
but only **Owner and Admin** can edit an existing one's protocol, and only the **Owner** can delete
one — protocols are easy to accidentally overwrite, so editing them is a step above everyday data
entry.

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

## Inventory

A real running total of seed on hand (grams) and harvested/packaged crop on hand (ounces), per
crop — nothing to re-count or re-type. It updates itself:

- **Seed purchases** (Purchases page → "Seed purchase" mode) add to that crop's seed grams.
- **Starting a batch** (Batches) subtracts its dry seed weight from seed grams.
- **Marking a batch harvested** (Batches → Current Run → "Harvest") adds its fresh weight, in
  ounces, to that crop's harvested stock.
- **Logging a sale** (Sales) subtracts from harvested stock — directly for oz/lb sales, or via the
  crop's "oz per tray" / "oz per clamshell" conversion (set on the Crop Library) for tray/clamshell
  sales. Sales with no crop selected, or no conversion set for that unit, don't touch inventory.
- **Editing or deleting** a purchase, batch, or sale automatically reverses its inventory effect —
  there's no manual bookkeeping to keep in sync.

Set a **low-stock alert (trays remaining)** per crop right on the Inventory page — it's based on
each crop's **sow rate** (grams of seed per tray, editable on the Crop Library), so the alert speaks
in "trays worth of seed left," not just grams. Crops below their threshold show a red **Low stock**
flag on Inventory and a banner on the Dashboard, and are flagged red in the crop picker when
starting a new batch. There's also a manual **Adjust** action on Inventory for corrections (recounts,
spoilage, etc.) that don't come from a purchase/batch/sale.

The 14 existing crops' sow rates were pre-filled with standard published estimates so the feature
works immediately — edit them on the Crop Library page with your real numbers whenever you have
them (e.g. from a Bootstrap Farmer–style cheat sheet).

## Fields — for high tunnel, commercial, or urban field crops (not just microgreens trays)

Harvest OS now supports field-crop tracking alongside microgreens, for growers running open
fields, high tunnels, or other row-crop operations. Turn it on in **Settings → "What do you grow or
raise?"** — this adds a **Fields** item to the menu (nothing is deleted if you turn it back off,
it just leaves the menu).

- **Fields and rows**: add a field, optionally split into named rows/beds — or leave it with no
  rows to track the whole field as one unit. A field can be flagged as a **high tunnel** for
  growers who track that microclimate separately.
- **Plantings**: log what's planted where and when, same spirit as a microgreens batch but scoped
  to a field/row instead of a tray.
- **Soil tests**: attach a photo of a soil test report and click **"Fill in from photo"** to
  auto-populate pH, N-P-K, and organic matter — this needs `ANTHROPIC_API_KEY` set (see
  `.env.example`); without it, the fields are just blank and you fill them in by hand. Either way,
  every field is a normal editable input — the auto-fill is a shortcut, never the source of truth.
- **Nutrient log**: a simple dated record of what was applied to a field/row.
- **Rotation warning**: starting a new planting checks whether the same crop family was grown in
  that field/row within the last 3 years, and shows a dismissible red warning if so — it informs,
  it never blocks. This depends on tagging crops with a **crop family** (e.g. "Brassicaceae") on
  the Crop Library page, and marking which crops are used for field crops vs. microgreens (a crop
  can be both).

Cannabis-specific compliance/track-and-trace features are on the roadmap but not built yet — see
the project's platform-expansion concept doc for the fuller plan.

## Livestock — animal records, health log, and withdrawal-period tracking

Turn it on in **Settings → "What do you grow or raise?"** — this adds a **Livestock** item to the
menu.

- **Animals**: ear tag number (unique per farm), breed, birth date, and optional sire/dam links to
  other animal records for basic lineage tracking.
- **Health log**: a dated entry per animal — vaccine, medication, illness, injury, or other — with
  an optional withdrawal period in days (how long before it's safe to sell or milk that animal).
- **Withdrawal status**: each animal shows a green "Clear" or red "Restricted until <date>" badge,
  computed automatically from its health log — no manual tracking, no push notifications yet (a
  fast-follow, not a blocker for this first version).

Feed/nutrition logging, a crop/livestock home-page toggle, and cannabis-specific compliance
features are still on the roadmap — see the project's platform-expansion concept doc.

## Grazing — rotational pasture planning

Also lives on the Livestock page, below your animal list, once Livestock is turned on. This is a
feature no crop-only or livestock-only competitor product can offer, since it needs both Fields and
Animals in the same system — you have both.

- **Log a grazing move**: pick a field/pasture (and row/section if you use those), a start date, and
  optionally an end date and a note on which animals — same "log it and move on" style as
  everything else in the app.
- **Rest warning**: before saving, Harvest OS checks whether that field/row was grazed too recently
  (default 25 days, in line with typical 21–40+ day rotational-grazing rest windows) and shows a
  dismissible warning if so — informing, not blocking, exactly like the crop-rotation warning on
  Fields.
- **History**: the Livestock page shows your last 50 grazing entries, most recent first.

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
