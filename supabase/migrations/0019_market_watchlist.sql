-- Phil: live commodity pricing feed (#4 on the market-feature roadmap) — lets a farm pin the USDA
-- MARS reports they care about (feeder cattle, hay, a produce terminal market, etc.) so they show
-- up on a dedicated Market Prices page without re-searching every time. The actual price data is
-- fetched live from USDA's API server-side (see app/api/market/*) and never stored here — this
-- table only remembers which reports an org wants pinned.

create table if not exists market_watchlist (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  report_slug text not null,
  report_title text not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique (org_id, report_slug)
);

create index if not exists market_watchlist_org_idx on market_watchlist(org_id);

alter table market_watchlist enable row level security;

drop policy if exists market_watchlist_select on market_watchlist;
create policy market_watchlist_select on market_watchlist for select using (is_org_member(org_id));
drop policy if exists market_watchlist_write on market_watchlist;
create policy market_watchlist_write on market_watchlist for insert with check (is_org_editor(org_id));
drop policy if exists market_watchlist_delete on market_watchlist;
create policy market_watchlist_delete on market_watchlist for delete using (is_org_editor(org_id));

grant select, insert, delete on market_watchlist to authenticated;
revoke all on market_watchlist from anon;
