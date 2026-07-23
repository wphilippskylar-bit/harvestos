-- Phil: field/herd-level profitability mapping — the #1 item on the free-feature roadmap, closing
-- the gap with Granular's headline "field-level ROI" feature. Two existing views already do this
-- at the crop level (crop_margin, monthly_pnl, both from 0001) but were never surfaced anywhere in
-- the app — this migration adds the missing field/animal attribution so costs and revenue can be
-- rolled up per field and per animal too, and the frontend change (separate) finally puts all of
-- it on a page.
--
-- Purchases and sales previously only linked to a crop/batch (fine for microgreens, where a batch
-- IS the field-crop equivalent). Field crops and livestock had no way to say "this purchase was for
-- that field" or "this sale was that animal" — adding nullable field_id/animal_id closes that,
-- without touching how microgreens purchases/sales work today (those columns stay null for them).

alter table purchases add column if not exists field_id uuid references fields(id) on delete set null;
alter table sales add column if not exists field_id uuid references fields(id) on delete set null;
alter table sales add column if not exists animal_id uuid references animals(id) on delete set null;
alter table animal_health_logs add column if not exists cost numeric;

create index if not exists purchases_field_idx on purchases(field_id) where field_id is not null;
create index if not exists sales_field_idx on sales(field_id) where field_id is not null;
create index if not exists sales_animal_idx on sales(animal_id) where animal_id is not null;

-- Per-field profitability: costs from purchases tagged to that field, revenue from sales tagged to
-- that field. security_invoker so RLS on the underlying tables is always enforced against the
-- querying role, same pattern as every other view in this app.
create or replace view field_margin as
select
  f.id as field_id,
  f.org_id,
  f.name as field_name,
  coalesce(p.total_cost, 0) as total_cost,
  coalesce(s.total_revenue, 0) as total_revenue,
  coalesce(s.total_revenue, 0) - coalesce(p.total_cost, 0) as profit
from fields f
left join (
  select field_id, sum(total) as total_cost from purchases where field_id is not null group by field_id
) p on p.field_id = f.id
left join (
  select field_id, sum(total_revenue) as total_revenue from sales where field_id is not null group by field_id
) s on s.field_id = f.id;

alter view field_margin set (security_invoker = true);

-- Per-animal profitability: costs from health-log entries with a cost recorded (vet visits,
-- medication, etc.), revenue from sales tagged to that animal (e.g. selling a finished steer).
create or replace view animal_margin as
select
  a.id as animal_id,
  a.org_id,
  a.ear_tag_number,
  coalesce(h.total_cost, 0) as total_cost,
  coalesce(s.total_revenue, 0) as total_revenue,
  coalesce(s.total_revenue, 0) - coalesce(h.total_cost, 0) as profit
from animals a
left join (
  select animal_id, sum(cost) as total_cost from animal_health_logs where cost is not null group by animal_id
) h on h.animal_id = a.id
left join (
  select animal_id, sum(total_revenue) as total_revenue from sales where animal_id is not null group by animal_id
) s on s.animal_id = a.id;

alter view animal_margin set (security_invoker = true);

grant select on field_margin, animal_margin to authenticated;
revoke all on field_margin, animal_margin from anon;
