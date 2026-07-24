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
   `0013_grazing.sql`, then `0014_platform_admin.sql`, then `0015_profitability.sql`, then
   `0016_farm_inputs_labor_tax.sql`, then `0017_equipment_livestock_purchases.sql`, then
   `0018_field_map.sql`, then `0019_market_watchlist.sql`, then `0020_nav_prefs.sql` — **in that
   exact order**, each as its own run. (They build on each other; running out of order will error.)
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

## Platform overview — aggregate stats for institutional pitches

A `/admin` page shows counts across every farm on Harvest OS — total farms, how many use each
module, total acres/animals/plantings/batches tracked — with **no financial data and no
individual-farm breakdown**, just anonymized totals. This is the view to show OSU Extension, the
Chickasaw Nation, or USDA when the pitch is "here's the reach and impact of the platform," as
opposed to any one farm's private numbers.

**Getting access**: this is deliberately not something anyone can grant themselves in the app — you
add yourself once via SQL Editor:
```sql
insert into platform_admins (user_id)
select id from auth.users where email = 'your-login-email@example.com';
```
Then visit `/admin` while logged in with that account. There's no nav link to it yet (kept
intentionally low-key since it's an internal tool, not a farmer-facing feature) — just go to the
URL directly.

**Creating a test/demo account for an outside reviewer**: sign up for a brand-new account in the
live app (private/incognito browser window, any email) — that creates a fresh, empty org exactly
like any new farm would get. Then in Supabase SQL Editor, find that org's id and run:
```sql
select seed_demo_org('paste-the-new-orgs-id-here');
```
This fills that one org with generic sample data across every module (a demo crop, field, planting,
two animals with a health-log entry showing a live withdrawal period, a grazing entry, a batch, a
purchase, and a sales channel) — deliberately **not** your real ACF business data, so it's safe to
hand the login credentials to an outside reviewer (another AI, a partner, anyone) without exposing
anything proprietary. Share the live app URL plus that test account's email/password.

## Profitability — which crops, fields, and animals actually make money

A new **Profitability** nav item rolls up your existing Purchases and Sales data into a real P&L
view, closing the gap with Granular's headline "field-level ROI" feature — no separate spreadsheet.

- **Monthly P&L**: revenue vs. costs across the whole operation, most recent months first.
- **By crop**: batches and their linked sales, per crop (this was already computed in the database
  since the very first migration — it just never had a page to show up on until now).
- **By field**: only picks up purchases/sales you've explicitly tagged to a field — both the
  Purchases and Sales forms now have an optional "Field" dropdown that shows up once you have at
  least one field. Untagged purchases/sales don't count toward any field's numbers.
- **By animal**: costs come from the "Cost ($)" field on Health Log entries (also new, optional —
  log a vet bill or medication cost there), revenue comes from sales tagged to that animal (the
  Sales form now has an optional "Animal" dropdown, for when you sell a finished animal).

Nothing here is automatic — you get out what you tag in. If a purchase or sale isn't tagged to a
field or animal, it still counts in the overall Monthly P&L and (for microgreens) the by-crop
numbers, it just won't show up broken out by field or animal.

**Important — Monthly P&L numbers changed with migration 0016.** The original `monthly_pnl` view
(since the very first migration) had a bug: it joined sales and purchases directly by month before
summing, which multiplies matching rows together within the same month instead of adding them —
so any month with more than one purchase *and* more than one sale had its revenue and cost totals
silently inflated. Migration `0016_farm_inputs_labor_tax.sql` rewrites the view correctly (each
source is summed independently, then joined). If your Monthly P&L numbers look different — usually
lower, and more accurate — after running 0016, that's why. Nothing about your underlying purchase
or sale records changed, only how the totals are calculated.

## Farm supplies, labor, tax write-offs, and break-even (migration 0016)

- **Farm supplies (Inventory page)**: nutrients and commercial seed now get their own
  stock-on-hand tracking section on the Inventory page, same pattern as the existing seed-gram /
  harvested-oz tracking — add an item, log usage, get a low-stock badge once you're under your
  threshold. Buying more through Purchases (see below) tops up stock automatically.
- **Feed & herd summary (Livestock page)**: feed gets the same stock-on-hand tracking, plus a herd
  head-count rollup grouped by breed and status (active/sold/etc.) at the top of the page.
- **Labor (new "Labor" nav item)**: log hours and an hourly rate (or a flat fee — enter 1 hour and
  the flat amount as the rate) per worker per day, optionally tied to a field, animal, or batch so
  it flows into that item's profitability, plus a tax-deductible checkbox. Labor cost now also
  counts toward Monthly P&L, field/animal margin, and break-even alongside purchases.
- **Supply purchases (Purchases page)**: a third "Supply purchase" toggle next to General/Seed lets
  you buy a nutrient/feed/commercial-seed item straight from the Purchases form — it auto-adds to
  that item's stock on hand, same as seed purchases already did for crop seed inventory.
- **Tax write-offs**: every purchase and labor entry now has a "tax-deductible" checkbox (checked
  by default). A new "Tax write-offs" section at the bottom of the Profitability page totals
  deductible purchases and labor by year and category, with a CSV export for handing to your
  accountant. Settings also has an "Agricultural tax exemption" toggle to flag if your farm holds
  one — it doesn't change any calculations yet, it's just recorded for future filings/exports.
- **Break-even (Profitability page)**: a new "Break-even point" panel with a dropdown to switch
  scope — whole operation, a specific field, or a specific animal — showing total cost, total
  revenue, and how much revenue is left (or how much surplus you're past) break-even for that
  scope. Per-crop/batch break-even isn't included yet since crop-level purchases aren't currently
  cost-tagged the way fields and animals are — flag if you want that added next.
- **Commercial crop tag (Crop Library)**: crops can now be tagged "Commercial / wholesale scale" in
  addition to Microgreens and Field crop, as a third checkbox on the crop form.

## Equipment, livestock purchases, and an easier supply-purchase flow (migration 0017)

Closes three gaps found right after shipping 0016:

- **Supply purchases no longer require an existing item first.** The "Supply purchase" mode on the
  Purchases form used to only appear once you'd already added a nutrient/feed/commercial-seed item
  on Inventory or Livestock — a dead end on your very first purchase. Now the mode is always there,
  and its item dropdown has a "+ New item…" option that lets you name a brand-new item, pick its
  category and unit, and buy it — all in one form.
- **Equipment**, on the Purchases page, is now two things: a stock-on-hand list (same pattern as
  nutrients/feed, for smaller items you just want a count of — a box of hand tools, etc.), and an
  "Equipment" purchase mode for big-ticket depreciable assets (tractors, mowers, etc.) that asks for
  salvage value and useful life, then tracks straight-line depreciation automatically — annual
  depreciation, accumulated depreciation, and current book value, shown in a table on the Purchases
  page.
- **Livestock purchases**: a new "Livestock" mode on the Purchases form lets you buy an animal and
  either create a brand-new animal record (ear tag, breed, birth date) or attach the cost to an
  animal you already have — either way, the purchase cost now counts toward that animal's numbers
  on the Profitability page, the same way health-log costs and tagged labor already did.

## Compliance & audit-trail exports — new "Compliance" nav item

Closes the other half of the AgriWebb feature comparison (animal mapping/withdrawal tracking was
already built in 0012 — this is the "automated compliance reporting and biosecurity audit trail"
half). No new data collection — it packages what you're already logging (health treatments,
withdrawal periods, restriction status, pasture movement) into a dated report:

- **Date range picker** — defaults to the last 12 months, adjustable.
- **Current herd biosecurity status** — every animal, with active restrictions flagged in red.
- **Treatment audit trail** — every logged treatment in the period, with withdrawal end dates
  called out.
- **Pasture movement log** — where the herd's been, for traceability.
- **Export as CSV** (treatments and grazing, separately) or **Print / Save as PDF** for the whole
  formatted report — handy for a buyer, inspector, or grant application asking "show me your
  records." The print view drops the on-screen controls and just shows the report itself.

Only shows up in the nav once Livestock tracking is turned on (Settings → "What do you grow or
raise?"), same as the Livestock page itself.

## Map — a free visual layout of your fields, high tunnels, and pastures (migration 0018)

Closes the most visible gap against Climate FieldView and AgriWebb, which both lead with a map —
without needing in-cab hardware sync or a paid map service. New "Map" nav item (shows once Fields
or Livestock tracking is on):

- **Set pin location**: pick a field from the dropdown, click "Set pin location," then click
  anywhere on the map to drop a pin for it.
- **Draw boundary**: pick a field, click "Draw boundary," then click the map to place each corner
  of the field/pasture outline — click "Finish boundary" once you've placed at least 3 points. The
  drawn area's approximate acreage shows in the field list below the map.
- Runs on free OpenStreetMap tiles via Leaflet — no API key, no per-map-load fee, no vendor
  contract.
- Read-only for viewers; editors (owner/admin/member) get the pin/boundary controls.

Both are optional and additive — existing fields with nothing set just don't show a pin/boundary
until you add one.

## Market Prices — live USDA commodity pricing (migration 0019)

Closes the live-pricing gap on the roadmap — none of the six competitors researched lead with this.
New "Market Prices" nav item, powered by USDA's own free MyMarketNews (MARS) API — real government
market data, not a paid third-party feed.

**One-time setup (free, ~5 minutes):**
1. Go to [mymarketnews.ams.usda.gov](https://mymarketnews.ams.usda.gov) and click **Login**.
2. You'll be sent to USDA's eAuth sign-in — register a new eAuth account if you don't have one
   (confirmation email usually arrives within a couple hours).
3. Once logged in, click your account name and choose **Show API key**.
4. In Vercel: your project → **Settings → Environment Variables** → add `USDA_MARS_API_KEY` with
   that key as the value → redeploy.

Until that key is set, the Market Prices page shows a clear "not set up yet" message instead of
failing silently — everything else in the app works normally either way.

**Once it's set up:**
- Quick-filter buttons for feeder cattle, slaughter cattle, hogs, hay, and fruits/vegetables, or
  search any commodity by name.
- Click a report to see its current data — USDA report formats vary a lot by commodity, so the
  table adapts to whatever columns that particular report returns rather than assuming a fixed
  shape.
- **Pin** any report so it shows up at the top of the page next time, without re-searching.
- Data refreshes roughly every 15 minutes (results are cached briefly to stay well within USDA's
  fair-use limits) — this is real-time-enough for market awareness, not built for high-frequency
  trading.

## Dashboard, nav order, and a Market Prices search fix (migration 0020)

- **Dashboard is now clickable everywhere** — every stat tile and chart card links to the page it
  summarizes (Total revenue → Sales, Total costs → Purchases, Trays in production → Batches, Sales
  channels → Sales Channels, both charts and Goals → Profitability/Channels/Goals).
- **Pinned Profitability and Market Prices** now show as their own cards on the Dashboard — the
  Profitability card shows the latest month's revenue/cost/profit, the Market Prices card lists
  your pinned USDA reports (empty state prompts you to pin some from the Market Prices page).
  Both link straight to their full page.
- **Nav reordered by default** — grouped by theme now (production tabs, then money tabs, then
  reference tabs) instead of the order features happened to ship in.
- **Customizable nav order** — new "Customize navigation" section in Settings lets each person
  reorder their own left nav with up/down buttons (Dashboard always stays pinned first). It's
  per-user, not per-farm — everyone on the team can have their own layout. "Reset to default" puts
  it back to the theme-grouped order.
- **Market Prices search fixed** — the original version tried to filter USDA's report list by
  commodity using a query-string parameter that, it turns out, USDA only documents for filtering
  *within* a single report's data rows, not for searching the report index itself. That's why
  searches often came back empty or wrong. Fixed by fetching the full report index (cached 6h,
  since it rarely changes) and matching your search term against it directly — much more reliable.

## Greenhouse / Indoor — a separate module for CEA growing, and Batches renamed to Microgreens (migration 0021)

- **"Batches" is now "Microgreens"** in the left nav — same page, same data, just a clearer name now
  that indoor/greenhouse growing has its own dedicated module instead of being lumped in.
- **New "Greenhouse / Indoor" module** for controlled-environment agriculture (CEA) — greenhouse,
  high tunnel run as a climate-controlled space, indoor vertical farm, or hydroponic setups. It's a
  genuinely separate set of tables from both Batches (microgreens trays) and Fields (open field
  crops), not a relabeling of either: `cea_areas` (your greenhouses/rooms/systems), `cea_area_rows`
  (optional row/bed subdivisions within an area), and `cea_plantings` (one crop, in one area/row,
  over one growing cycle — status planted/growing/harvested/failed, plus yield).
- **Its own environment log** — `cea_environment_logs`, separate from the microgreens Environment
  Log. A single shared log wasn't capturing what every grower needed, so CEA's log adds CO2 (ppm)
  and nutrient EC on top of the temperature/humidity/VPD/light fields the microgreens log already
  tracks. The Environment Log nav item is now scoped to farms with microgreens turned on; CEA farms
  log readings from within the Greenhouse / Indoor page instead.
- **Cost/revenue attribution** — Purchases, Sales, and Labor entries can optionally be tagged to a
  CEA area (same pattern as Fields), which feeds a new `cea_margin` view so Profitability can show
  cost/revenue/profit per greenhouse or indoor area, same as it already does for fields and animals.
- **Crop Library** — crops can now be tagged "Greenhouse / Indoor / CEA" alongside (or instead of)
  Microgreens / Field crop / Commercial, so the crop picker in the Greenhouse / Indoor page only
  offers crops you've actually marked as grown that way.
- **Settings → "What do you grow or raise?"** has a new "Greenhouse, indoor, or hydroponic crops"
  toggle that turns the module on/off, same as the other operation types. Turning it off just hides
  the nav item — nothing is deleted, so it's safe to toggle if you're not sure yet.
- Run `0021_cea_module.sql` after `0020_nav_prefs.sql`.

## Unit preferences — pounds vs ounces, acres vs square feet (migration 0022)

- **Settings → "Units"** — pick pounds or ounces for weight, and acres or square feet for field/area
  size. Microgreens-only farms default to ounces automatically; everyone else defaults to pounds and
  acres. This doesn't touch anything already saved — it changes what new entries default to and how
  sizes are displayed.
- **Fields now has a size field** — Fields never had a size column before; adding unit preferences
  gave it one (`size_acres`, optional, shown in whichever unit you've picked).
- **Greenhouse / Indoor area size** now displays in your preferred unit too, converting from the
  stored square-footage automatically.
- Under the hood, values are always stored in one fixed unit per column (fields in acres, CEA areas
  in square feet) — `lib/units.ts` converts to/from your preferred display unit, so switching the
  setting later doesn't require touching any saved data.
- Run `0022_unit_prefs.sql` after `0021_cea_module.sql`.

## Market Prices: condensed columns, wider search matching, and dashboard customization (migration 0023)

- **Market Prices table is condensed by default** — USDA reports can return dozens of fields; the
  table now shows just what a typical farmer/rancher checks first (date, price, head count/quantity,
  grade/quality/class), picked automatically from whatever fields that specific report has. A "Show
  all columns" button next to the report title expands to the full USDA report when you want it.
- **Search matches more reliably** — the old search required your exact search phrase to appear
  word-for-word in a report's title, so "Fruits and Vegetables" came back empty against a report
  titled "Fruit & Vegetable" (singular, ampersand instead of "and"). Search now matches each word
  separately, tolerates singular/plural, and normalizes "&" to "and", plus checks a few more fields
  (category, market type, office city/state) than before.
- **Settings → "Customize dashboard"** — hide any dashboard card you don't check (revenue/cost
  chart, sales channel pipeline, cost-per-tray, goals, profitability summary, market prices, recent
  batches) and reorder the rest, same per-user pattern as the nav customization from migration 0020.
  The four KPI tiles at the very top (revenue, costs, trays, channels) always stay put.
- Run `0023_dashboard_prefs.sql` after `0022_unit_prefs.sql`.

## Signup now asks what you grow/raise, and offers to pin market prices for you

- **"What do you grow or raise?"** is now part of account creation, not just something you find
  later in Settings. New accounts pick their operation type(s) right on the signup form — same
  options as Settings (Microgreens, Outdoor field crops, Greenhouse/Indoor, Livestock) — and the
  right nav tabs show up immediately instead of everyone starting as microgreens-only. Still fully
  editable later in Settings, same as before.
- **Optional auto-pin for Market Prices** — a checkbox on signup (checked by default) that, based
  on what you picked, searches USDA's live reports and pins the ones that are actually relevant
  (e.g. picking Livestock pins Feeder Cattle and Slaughter Cattle; Outdoor field crops pins Hay and
  Fruit). This is best-effort — if `USDA_MARS_API_KEY` isn't configured yet, it just skips silently
  rather than blocking account creation, and everything it would've pinned is still just a search
  away on the Market Prices page.
- No new migration — this only changes what the signup form does with columns that already exist
  (`organizations.operation_types`, `market_watchlist`).

## Market search: "Fruits and Vegetables" actually returning results now

- Root cause of the earlier fix not working: USDA doesn't use the words "fruit" or "vegetable"
  anywhere in these report titles — their own official category is **"Specialty Crops"** (e.g.
  "National Retail Report - Specialty Crops"). No amount of word-matching or plural tolerance was
  ever going to find that, since the actual words just weren't in the data.
- The "Fruits & vegetables" quick filter now searches "Specialty Crops" directly, and free-text
  search maps "fruit," "fruits," "vegetable," "vegetables," "veggies," and "produce" to USDA's real
  terminology, so typing what you'd actually search for still finds the right reports.

## Frost/freeze alerts for Fields — free weather integration (no migration)

- Fields with a pinned map location (from the Map feature, migration 0018) now get a frost/freeze
  banner on the Fields page when NOAA's free public forecast (api.weather.gov — no API key, no
  cost) shows a nighttime low at or below 36°F in the next 3 nights. Below 32°F is called out as a
  hard freeze specifically.
- Purely additive — no new columns, no new migration. Uses the `map_lat`/`map_lng` fields already
  added for the Map feature and a new server-side proxy route (`/api/weather/forecast`) since
  NOAA's API needs a descriptive User-Agent header that has to come from a server, not the browser.
- US-only, since NOAA's National Weather Service API only covers the US — fine for now since that's
  Harvest OS's whole audience.

## Expanded push notifications, and a new Schedule + SOPs pair of nav tabs (migration 0024)

- **Push notifications now cover four things, not two** — the daily digest (`/api/push/send-alerts`)
  already checked low microgreens stock and harvest-due batches; it now also checks harvest-due
  Greenhouse/Indoor (CEA) plantings and livestock withdrawal periods clearing within 2 days. Setup
  is unchanged — see the "Low-stock / harvest-due push notifications" section above for the VAPID
  key steps; this is a code change to what the existing cron checks, not a new setup step.
- **New "Schedule" tab** — plan plantings, harvests, maintenance, or sales tasks for any date, as
  far out as you want. Each item can optionally link to an existing batch, field, Greenhouse/Indoor
  area, or animal (so "Harvest Tray Batch #12" pulls in that batch directly instead of being a
  loose note), and has its own notify on/off switch plus a "remind me N days before" setting.
  Grouped into Overdue / Upcoming / Done on the page, filterable by type.
- **Schedule notification grouping** — a new Settings → "Schedule notifications" dropdown controls
  how Schedule reminders reach you as push notifications: bundled into the same daily digest as
  everything else (default), sent as their own separate push per item, or turned off entirely. This
  is an org-wide setting (`organizations.schedule_notify_mode`); each item's own notify toggle still
  has to be on for it to fire at all.
- **New "SOPs" tab** — a place for standard operating procedures (sanitizing steps, harvest
  checklists, onboarding notes) with an optional category and a plain-text/numbered-list body,
  separate from the day-to-day Schedule so a "how we do X" reference doesn't get buried among
  one-off planned tasks.
- Run `0024_schedule_sops.sql` after `0023_dashboard_prefs.sql`.

## Installed app not updating after a deploy

If you (or a team member) installed Harvest OS to a phone or desktop home screen and it kept
showing an old version after you pushed changes, that was a service-worker caching bug, not a
Vercel deployment-link issue — the project's URL stays the same on every push. It's fixed as of
this update: the service worker file is now marked non-cacheable, its internal cache version is
auto-stamped with the deploy's commit hash on every build, and the installed app automatically
reloads itself once when a new version takes over. Nothing to do on your end beyond deploying this
update — the next time anyone opens the installed app, it'll pick up the fix and stay current from
then on.

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
