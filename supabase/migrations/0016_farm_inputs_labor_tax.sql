-- Phil: farm-supplies inventory (nutrients, feed, commercial seed), a herd head-count rollup,
-- labor tracking, tax-deductible flagging + an ag tax-exemption toggle, and a "commercial" crop
-- tag — one batch of related asks from a single message. Each piece reuses an existing pattern
-- already proven in this codebase rather than inventing a new one:
--   - farm_supplies/supply_movements mirrors the crops/inventory_movements ledger pattern from
--     0008, generalized beyond crops (nutrients, feed, and commercial seed are not "crops," so they
--     needed their own catalog+ledger rather than being shoehorned into inventory_movements).
--   - labor_entries mirrors purchases (a cost log), with the same optional field_id/animal_id
--     attribution added to purchases/sales in 0015, so labor costs flow into field_margin and
--     animal_margin the same way purchase costs already do.
--   - tax_deductible mirrors the boolean-flag pattern already used elsewhere (is_high_tunnel,
--     is_premium) rather than a new subsystem.

-- ============================================================
-- FARM SUPPLIES: nutrients, feed, commercial seed — stock on hand, mirroring crops/inventory
-- ============================================================

create table if not exists farm_supplies (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  category text not null check (category in ('nutrient', 'feed', 'commercial_seed')),
  unit text not null default 'unit', -- e.g. "lb", "gal", "bag", "50lb bag"
  low_stock_threshold numeric,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists farm_supplies_org_idx on farm_supplies(org_id, category);

create table if not exists supply_movements (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  supply_id uuid not null references farm_supplies(id) on delete cascade,
  delta numeric not null,
  reason text not null default 'adjustment', -- 'purchase' | 'usage' | 'adjustment'
  source_table text,
  source_id uuid,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists supply_movements_supply_idx on supply_movements(supply_id, created_at desc);

create or replace view supply_stock as
select
  fs.id as supply_id,
  fs.org_id,
  fs.name,
  fs.category,
  fs.unit,
  fs.low_stock_threshold,
  coalesce(sum(sm.delta), 0) as qty_on_hand
from farm_supplies fs
left join supply_movements sm on sm.supply_id = fs.id
group by fs.id, fs.org_id, fs.name, fs.category, fs.unit, fs.low_stock_threshold;

alter view supply_stock set (security_invoker = true);

-- Purchases can optionally be tied to a farm-supply item (a nutrient/feed/commercial-seed
-- purchase), same "optional, additive" pattern as the field_id/animal_id columns added in 0015.
alter table purchases add column if not exists supply_id uuid references farm_supplies(id) on delete set null;
alter table purchases add column if not exists supply_qty numeric;

create or replace function sync_purchase_supply() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if TG_OP = 'DELETE' then
    delete from supply_movements where source_table = 'purchases' and source_id = OLD.id;
    return OLD;
  end if;

  delete from supply_movements where source_table = 'purchases' and source_id = NEW.id;

  if NEW.supply_id is not null and NEW.supply_qty is not null and NEW.supply_qty > 0 then
    insert into supply_movements (org_id, supply_id, delta, reason, source_table, source_id, created_by)
    values (NEW.org_id, NEW.supply_id, NEW.supply_qty, 'purchase', 'purchases', NEW.id, NEW.created_by);
  end if;

  return NEW;
end;
$$;

drop trigger if exists purchases_supply_sync on purchases;
create trigger purchases_supply_sync
after insert or update or delete on purchases
for each row execute function sync_purchase_supply();

alter table farm_supplies enable row level security;
alter table supply_movements enable row level security;

drop policy if exists farm_supplies_select on farm_supplies;
create policy farm_supplies_select on farm_supplies for select using (is_org_member(org_id));
drop policy if exists farm_supplies_write on farm_supplies;
create policy farm_supplies_write on farm_supplies for insert with check (is_org_editor(org_id));
drop policy if exists farm_supplies_update on farm_supplies;
create policy farm_supplies_update on farm_supplies for update using (is_org_editor(org_id));
drop policy if exists farm_supplies_delete on farm_supplies;
create policy farm_supplies_delete on farm_supplies for delete using (is_org_editor(org_id));

drop policy if exists supply_movements_select on supply_movements;
create policy supply_movements_select on supply_movements for select using (is_org_member(org_id));
drop policy if exists supply_movements_write on supply_movements;
create policy supply_movements_write on supply_movements for insert with check (is_org_editor(org_id));
drop policy if exists supply_movements_delete on supply_movements;
create policy supply_movements_delete on supply_movements for delete using (is_org_editor(org_id));

grant select, insert, update, delete on farm_supplies to authenticated;
grant select, insert, delete on supply_movements to authenticated;
grant select on supply_stock to authenticated;
revoke all on farm_supplies, supply_movements, supply_stock from anon;

-- ============================================================
-- HERD HEAD-COUNT ROLLUP (livestock's other requested "inventory" view)
-- ============================================================

create or replace view herd_summary as
select
  org_id,
  status,
  coalesce(breed, 'Unspecified breed') as breed,
  count(*) as head_count
from animals
group by org_id, status, coalesce(breed, 'Unspecified breed');

alter view herd_summary set (security_invoker = true);
grant select on herd_summary to authenticated;
revoke all on herd_summary from anon;

-- ============================================================
-- COMMERCIAL CROP TAG — a third "used for" value on the Crop Library, alongside microgreens and
-- field_crop, for crops grown at commercial/wholesale scale.
-- ============================================================

alter table crops drop constraint if exists crops_applicable_to_check;
alter table crops add constraint crops_applicable_to_check
  check (applicable_to <@ array['microgreens','field_crop','commercial']::text[]);

-- ============================================================
-- LABOR — a cost log mirroring purchases, with the same optional field/animal/batch attribution.
-- ============================================================

create table if not exists labor_entries (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  work_date date not null default current_date,
  worker_name text,
  hours numeric not null default 0,
  hourly_rate numeric not null default 0,
  cost numeric generated always as (hours * hourly_rate) stored,
  field_id uuid references fields(id) on delete set null,
  animal_id uuid references animals(id) on delete set null,
  batch_id uuid references batches(id) on delete set null,
  tax_deductible boolean not null default true,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists labor_entries_org_idx on labor_entries(org_id, work_date desc);

alter table labor_entries enable row level security;

drop policy if exists labor_entries_select on labor_entries;
create policy labor_entries_select on labor_entries for select using (is_org_member(org_id));
drop policy if exists labor_entries_write on labor_entries;
create policy labor_entries_write on labor_entries for insert with check (is_org_editor(org_id));
drop policy if exists labor_entries_update on labor_entries;
create policy labor_entries_update on labor_entries for update using (is_org_editor(org_id));
drop policy if exists labor_entries_delete on labor_entries;
create policy labor_entries_delete on labor_entries for delete using (is_org_editor(org_id));

grant select, insert, update, delete on labor_entries to authenticated;
revoke all on labor_entries from anon;

-- ============================================================
-- TAX: deductible flag on purchases + labor, an ag-tax-exemption toggle on the org, and a
-- year-by-category export view.
-- ============================================================

alter table purchases add column if not exists tax_deductible boolean not null default true;
alter table organizations add column if not exists ag_tax_exempt boolean not null default false;

create or replace view tax_deductible_summary as
select org_id, extract(year from purchase_date)::int as year, category, sum(total) as total_amount, 'purchase' as source
from purchases
where tax_deductible
group by org_id, extract(year from purchase_date)::int, category
union all
select org_id, extract(year from work_date)::int as year, 'Labor' as category, sum(cost) as total_amount, 'labor' as source
from labor_entries
where tax_deductible
group by org_id, extract(year from work_date)::int;

alter view tax_deductible_summary set (security_invoker = true);
grant select on tax_deductible_summary to authenticated;
revoke all on tax_deductible_summary from anon;

-- ============================================================
-- Pull labor costs into the existing field_margin / animal_margin / monthly_pnl views so labor
-- shows up in Profitability automatically, same as purchases/sales already do.
-- ============================================================

create or replace view field_margin as
select
  f.id as field_id,
  f.org_id,
  f.name as field_name,
  coalesce(p.total_cost, 0) + coalesce(l.total_cost, 0) as total_cost,
  coalesce(s.total_revenue, 0) as total_revenue,
  coalesce(s.total_revenue, 0) - (coalesce(p.total_cost, 0) + coalesce(l.total_cost, 0)) as profit
from fields f
left join (
  select field_id, sum(total) as total_cost from purchases where field_id is not null group by field_id
) p on p.field_id = f.id
left join (
  select field_id, sum(cost) as total_cost from labor_entries where field_id is not null group by field_id
) l on l.field_id = f.id
left join (
  select field_id, sum(total_revenue) as total_revenue from sales where field_id is not null group by field_id
) s on s.field_id = f.id;

alter view field_margin set (security_invoker = true);

create or replace view animal_margin as
select
  a.id as animal_id,
  a.org_id,
  a.ear_tag_number,
  coalesce(h.total_cost, 0) + coalesce(l.total_cost, 0) as total_cost,
  coalesce(s.total_revenue, 0) as total_revenue,
  coalesce(s.total_revenue, 0) - (coalesce(h.total_cost, 0) + coalesce(l.total_cost, 0)) as profit
from animals a
left join (
  select animal_id, sum(cost) as total_cost from animal_health_logs where cost is not null group by animal_id
) h on h.animal_id = a.id
left join (
  select animal_id, sum(cost) as total_cost from labor_entries where animal_id is not null group by animal_id
) l on l.animal_id = a.id
left join (
  select animal_id, sum(total_revenue) as total_revenue from sales where animal_id is not null group by animal_id
) s on s.animal_id = a.id;

alter view animal_margin set (security_invoker = true);

-- Rewritten to fix a real bug in the original (0001) version: joining sales and purchases directly
-- by org+month before aggregating causes row fan-out (every sale row paired with every purchase
-- row in the same month), inflating both sums well past their real totals once more than one row
-- existed on each side in a given month. Pre-aggregating each source by month first, then joining
-- the three already-summed results, avoids that entirely — this is the correct fix, not a
-- workaround, and it's why labor is folded in the same way rather than joined directly too.
create or replace view monthly_pnl as
with revenue as (
  select org_id, date_trunc('month', sale_date)::date as month, sum(total_revenue) as net_revenue
  from sales group by org_id, date_trunc('month', sale_date)
),
costs as (
  select org_id, date_trunc('month', purchase_date)::date as month, sum(total) as total_cost
  from purchases group by org_id, date_trunc('month', purchase_date)
),
labor as (
  select org_id, date_trunc('month', work_date)::date as month, sum(cost) as total_cost
  from labor_entries group by org_id, date_trunc('month', work_date)
),
months as (
  select org_id, month from revenue
  union select org_id, month from costs
  union select org_id, month from labor
)
select
  m.org_id,
  m.month,
  coalesce(r.net_revenue, 0) as net_revenue,
  coalesce(c.total_cost, 0) + coalesce(l.total_cost, 0) as copex,
  coalesce(r.net_revenue, 0) - (coalesce(c.total_cost, 0) + coalesce(l.total_cost, 0)) as profit
from months m
left join revenue r on r.org_id = m.org_id and r.month = m.month
left join costs c on c.org_id = m.org_id and c.month = m.month
left join labor l on l.org_id = m.org_id and l.month = m.month;

alter view monthly_pnl set (security_invoker = true);

grant select on field_margin, animal_margin, monthly_pnl to authenticated;
