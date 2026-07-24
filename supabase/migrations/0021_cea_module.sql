-- Phil: split "Batches" (microgreens) apart from a new, genuinely separate Greenhouse/Indoor/CEA
-- module — most growers doing controlled-environment production (greenhouse, high tunnel run as a
-- climate-controlled space, indoor vertical, hydroponic) aren't microgreens operations and the
-- tray/batch model doesn't fit them. This mirrors the Fields module (0011) structure — areas, an
-- optional row/bed subdivision, plantings — but as its own tables, plus its OWN environment-log
-- table rather than reusing microgreens' environmental_logs, since a single shared log wasn't
-- capturing what different growers needed (CEA growers care about CO2 and nutrient EC in a way
-- microgreens trays don't, for instance).

alter table organizations drop constraint if exists organizations_operation_types_check;
alter table organizations add constraint organizations_operation_types_check
  check (operation_types <@ array['microgreens','field_crop','livestock','cea']::text[]);

alter table crops drop constraint if exists crops_applicable_to_check;
alter table crops add constraint crops_applicable_to_check
  check (applicable_to <@ array['microgreens','field_crop','commercial','cea']::text[]);

-- ============================================================
-- CEA AREAS + ROWS (mirrors fields/field_rows)
-- ============================================================

create table if not exists cea_areas (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  area_type text not null default 'greenhouse' check (area_type in ('greenhouse','high_tunnel','indoor_vertical','hydroponic','other')),
  sq_ft numeric,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cea_areas_org_idx on cea_areas(org_id);

create table if not exists cea_area_rows (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  area_id uuid not null references cea_areas(id) on delete cascade,
  label text not null,
  created_at timestamptz not null default now()
);

create index if not exists cea_area_rows_area_idx on cea_area_rows(area_id);

-- ============================================================
-- CEA PLANTINGS (mirrors plantings — one crop, in one area/row, over one growing cycle)
-- ============================================================

create table if not exists cea_plantings (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  area_id uuid not null references cea_areas(id) on delete cascade,
  row_id uuid references cea_area_rows(id) on delete set null,
  crop_id uuid references crops(id),
  crop_name_snapshot text,
  planted_date date not null default current_date,
  expected_harvest_date date,
  harvest_date date,
  status text not null default 'planted' check (status in ('planted','growing','harvested','failed')),
  yield_amount numeric,
  yield_unit text,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cea_plantings_org_idx on cea_plantings(org_id);
create index if not exists cea_plantings_area_idx on cea_plantings(area_id, row_id);

-- ============================================================
-- CEA ENVIRONMENT LOG — its own table, purpose-built for controlled-environment growing (adds
-- CO2 and nutrient EC on top of the temp/humidity/VPD/light fields microgreens' log already has).
-- ============================================================

create table if not exists cea_environment_logs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  area_id uuid not null references cea_areas(id) on delete cascade,
  planting_id uuid references cea_plantings(id) on delete set null,
  log_date date not null default current_date,
  time_of_day text,
  temperature_f numeric,
  humidity_pct numeric,
  vpd_kpa numeric,
  co2_ppm numeric,
  light_schedule_hours numeric,
  light_intensity_ppfd numeric,
  watering_volume_ml numeric,
  water_ph numeric,
  nutrient_ec numeric,
  nutrients_supplements text,
  pest_observations text,
  disease_observations text,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists cea_environment_logs_area_idx on cea_environment_logs(area_id, log_date desc);

-- ============================================================
-- Cost/revenue attribution — same optional, additive pattern as fields.field_id on
-- purchases/sales/labor_entries, so CEA growers get the same Profitability rollup fields do.
-- ============================================================

alter table purchases add column if not exists cea_area_id uuid references cea_areas(id) on delete set null;
alter table sales add column if not exists cea_area_id uuid references cea_areas(id) on delete set null;
alter table labor_entries add column if not exists cea_area_id uuid references cea_areas(id) on delete set null;

create or replace view cea_margin as
select
  a.id as area_id,
  a.org_id,
  a.name as area_name,
  coalesce(p.total_cost, 0) + coalesce(l.total_cost, 0) as total_cost,
  coalesce(s.total_revenue, 0) as total_revenue,
  coalesce(s.total_revenue, 0) - (coalesce(p.total_cost, 0) + coalesce(l.total_cost, 0)) as profit
from cea_areas a
left join (
  select cea_area_id, sum(total) as total_cost from purchases where cea_area_id is not null group by cea_area_id
) p on p.cea_area_id = a.id
left join (
  select cea_area_id, sum(cost) as total_cost from labor_entries where cea_area_id is not null group by cea_area_id
) l on l.cea_area_id = a.id
left join (
  select cea_area_id, sum(total_revenue) as total_revenue from sales where cea_area_id is not null group by cea_area_id
) s on s.cea_area_id = a.id;

alter view cea_margin set (security_invoker = true);

-- ============================================================
-- RLS — same is_org_member (read) / is_org_editor (write) pattern as every other module
-- ============================================================

alter table cea_areas enable row level security;
alter table cea_area_rows enable row level security;
alter table cea_plantings enable row level security;
alter table cea_environment_logs enable row level security;

drop policy if exists cea_areas_select on cea_areas;
create policy cea_areas_select on cea_areas for select using (is_org_member(org_id));
drop policy if exists cea_areas_write on cea_areas;
create policy cea_areas_write on cea_areas for insert with check (is_org_editor(org_id));
drop policy if exists cea_areas_update on cea_areas;
create policy cea_areas_update on cea_areas for update using (is_org_editor(org_id));
drop policy if exists cea_areas_delete on cea_areas;
create policy cea_areas_delete on cea_areas for delete using (is_org_editor(org_id));

drop policy if exists cea_area_rows_select on cea_area_rows;
create policy cea_area_rows_select on cea_area_rows for select using (is_org_member(org_id));
drop policy if exists cea_area_rows_write on cea_area_rows;
create policy cea_area_rows_write on cea_area_rows for insert with check (is_org_editor(org_id));
drop policy if exists cea_area_rows_update on cea_area_rows;
create policy cea_area_rows_update on cea_area_rows for update using (is_org_editor(org_id));
drop policy if exists cea_area_rows_delete on cea_area_rows;
create policy cea_area_rows_delete on cea_area_rows for delete using (is_org_editor(org_id));

drop policy if exists cea_plantings_select on cea_plantings;
create policy cea_plantings_select on cea_plantings for select using (is_org_member(org_id));
drop policy if exists cea_plantings_write on cea_plantings;
create policy cea_plantings_write on cea_plantings for insert with check (is_org_editor(org_id));
drop policy if exists cea_plantings_update on cea_plantings;
create policy cea_plantings_update on cea_plantings for update using (is_org_editor(org_id));
drop policy if exists cea_plantings_delete on cea_plantings;
create policy cea_plantings_delete on cea_plantings for delete using (is_org_editor(org_id));

drop policy if exists cea_environment_logs_select on cea_environment_logs;
create policy cea_environment_logs_select on cea_environment_logs for select using (is_org_member(org_id));
drop policy if exists cea_environment_logs_write on cea_environment_logs;
create policy cea_environment_logs_write on cea_environment_logs for insert with check (is_org_editor(org_id));
drop policy if exists cea_environment_logs_update on cea_environment_logs;
create policy cea_environment_logs_update on cea_environment_logs for update using (is_org_editor(org_id));
drop policy if exists cea_environment_logs_delete on cea_environment_logs;
create policy cea_environment_logs_delete on cea_environment_logs for delete using (is_org_editor(org_id));

grant select, insert, update, delete on cea_areas, cea_area_rows, cea_plantings, cea_environment_logs to authenticated;
grant select on cea_margin to authenticated;
revoke all on cea_areas, cea_area_rows, cea_plantings, cea_environment_logs, cea_margin from anon;
