-- Phil: closing three gaps found after using the 0016 batch —
--   1. Farm/ranch equipment gets its own stock-tracked list (like nutrients/feed) PLUS
--      depreciation tracking, since equipment is a capital asset that loses value over time in a
--      way consumable supplies don't.
--   2. Livestock purchases: buying an animal on the Purchases page now creates (or links to) an
--      animal record directly, so the cost flows into that animal's profitability automatically —
--      no separate manual step on the Livestock page.
--   3. (Frontend-only, no schema change needed) the Purchases page's supply-purchase mode was
--      gated behind already having a supply item, which was a chicken-and-egg dead end for a
--      first-time purchase — fixed in the form itself, not here.

-- ============================================================
-- EQUIPMENT: add as a farm_supplies category (stock-on-hand, reusing the existing pattern), plus
-- a dedicated equipment_assets table for per-item depreciation (straight-line), since depreciation
-- is inherently per-purchase (its own cost basis, purchase date, useful life) rather than a
-- fungible quantity like nutrients/feed.
-- ============================================================

alter table farm_supplies drop constraint if exists farm_supplies_category_check;
alter table farm_supplies add constraint farm_supplies_category_check
  check (category in ('nutrient', 'feed', 'commercial_seed', 'equipment'));

create table if not exists equipment_assets (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  purchase_date date not null default current_date,
  cost numeric not null default 0,
  salvage_value numeric not null default 0,
  useful_life_years numeric not null default 5,
  purchase_id uuid references purchases(id) on delete set null,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists equipment_assets_org_idx on equipment_assets(org_id, purchase_date desc);

alter table equipment_assets enable row level security;

drop policy if exists equipment_assets_select on equipment_assets;
create policy equipment_assets_select on equipment_assets for select using (is_org_member(org_id));
drop policy if exists equipment_assets_write on equipment_assets;
create policy equipment_assets_write on equipment_assets for insert with check (is_org_editor(org_id));
drop policy if exists equipment_assets_update on equipment_assets;
create policy equipment_assets_update on equipment_assets for update using (is_org_editor(org_id));
drop policy if exists equipment_assets_delete on equipment_assets;
create policy equipment_assets_delete on equipment_assets for delete using (is_org_editor(org_id));

grant select, insert, update, delete on equipment_assets to authenticated;
revoke all on equipment_assets from anon;

-- Straight-line depreciation: (cost - salvage_value) / useful_life_years per year, capped so
-- accumulated depreciation never exceeds the depreciable base and book value never drops below
-- salvage value.
create or replace view equipment_depreciation as
select
  e.id as asset_id,
  e.org_id,
  e.name,
  e.purchase_date,
  e.cost,
  e.salvage_value,
  e.useful_life_years,
  greatest(0, (e.cost - e.salvage_value) / nullif(e.useful_life_years, 0)) as annual_depreciation,
  least(
    e.cost - e.salvage_value,
    greatest(0, (e.cost - e.salvage_value) / nullif(e.useful_life_years, 0))
      * (extract(epoch from age(current_date, e.purchase_date)) / (365.25 * 86400))
  ) as accumulated_depreciation,
  e.cost - least(
    e.cost - e.salvage_value,
    greatest(0, (e.cost - e.salvage_value) / nullif(e.useful_life_years, 0))
      * (extract(epoch from age(current_date, e.purchase_date)) / (365.25 * 86400))
  ) as book_value
from equipment_assets e;

alter view equipment_depreciation set (security_invoker = true);
grant select on equipment_depreciation to authenticated;
revoke all on equipment_depreciation from anon;

-- ============================================================
-- LIVESTOCK PURCHASES: tie a purchase directly to an animal record (new or existing), same
-- optional/additive pattern as field_id, supply_id, etc.
-- ============================================================

alter table purchases add column if not exists animal_id uuid references animals(id) on delete set null;

alter table purchases drop constraint if exists purchases_category_check;
alter table purchases add constraint purchases_category_check
  check (category in ('Seeds', 'Trays', 'Medium', 'Equipment', 'Supplies', 'Packaging', 'Rent', 'Utilities', 'Insurance', 'Marketing', 'Livestock', 'Other'));

-- Fold purchase costs tagged to an animal into animal_margin, same as field_margin already does
-- for purchases.field_id.
create or replace view animal_margin as
select
  a.id as animal_id,
  a.org_id,
  a.ear_tag_number,
  coalesce(h.total_cost, 0) + coalesce(l.total_cost, 0) + coalesce(p.total_cost, 0) as total_cost,
  coalesce(s.total_revenue, 0) as total_revenue,
  coalesce(s.total_revenue, 0) - (coalesce(h.total_cost, 0) + coalesce(l.total_cost, 0) + coalesce(p.total_cost, 0)) as profit
from animals a
left join (
  select animal_id, sum(cost) as total_cost from animal_health_logs where cost is not null group by animal_id
) h on h.animal_id = a.id
left join (
  select animal_id, sum(cost) as total_cost from labor_entries where animal_id is not null group by animal_id
) l on l.animal_id = a.id
left join (
  select animal_id, sum(total) as total_cost from purchases where animal_id is not null group by animal_id
) p on p.animal_id = a.id
left join (
  select animal_id, sum(total_revenue) as total_revenue from sales where animal_id is not null group by animal_id
) s on s.animal_id = a.id;

alter view animal_margin set (security_invoker = true);
grant select on animal_margin to authenticated;
