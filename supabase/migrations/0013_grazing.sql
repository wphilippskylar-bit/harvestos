-- Phil: rotational grazing / pasture-recovery planner — the "stand out" feature identified while
-- comparing Harvest OS against the farm-management market (Climate FieldView, AgriWebb, Granular,
-- Trimble Ag, EOSDA, Farmbrite/Tend): none of those products track both crops/fields AND livestock
-- in one system, so none of them can warn a rancher that a pasture is being re-grazed before it's
-- had time to recover. Harvest OS already has fields (0011) and animals (0012) — this migration
-- just links them, reusing the exact "warn, don't block" pattern check_rotation_conflict() already
-- established for crop rotation.
--
-- New concepts:
--   1. grazing_events — one row per "herd/animals were on this field/row starting on this date,
--      until this date (null = still there)". Doesn't require per-animal tagging to be useful — an
--      optional free-text note field covers "which animals" for v1, matching the same
--      lightweight-first pattern used for nutrient_applications in 0011.
--   2. check_grazing_rest() — mirrors check_rotation_conflict(): looks up the most recent grazing
--      event on the same field/row and flags it if the pasture hasn't had `p_rest_days` days off
--      since livestock were last there. Default 25 days (mid-range of the typical 21-40+ day
--      rotational-grazing rest window), editable per call — informational only, never blocks.

create table if not exists grazing_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  field_id uuid not null references fields(id) on delete cascade,
  row_id uuid references field_rows(id) on delete set null,
  start_date date not null default current_date,
  end_date date,
  animal_notes text,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint grazing_events_dates check (end_date is null or end_date >= start_date)
);

create index if not exists grazing_events_org_idx on grazing_events(org_id);
create index if not exists grazing_events_field_idx on grazing_events(field_id, start_date desc);

-- Current occupancy per field/row — which pasture is actively grazed right now (end_date is null
-- or in the future), for a simple "who's where" view on the Livestock/Fields pages.
create or replace view grazing_status as
select
  f.id as field_id,
  f.org_id,
  ge.id as active_grazing_event_id,
  ge.row_id as active_row_id,
  ge.start_date as active_since,
  ge.animal_notes as active_animal_notes
from fields f
left join lateral (
  select * from grazing_events g
  where g.field_id = f.id and (g.end_date is null or g.end_date >= current_date)
  order by g.start_date desc
  limit 1
) ge on true;

alter view grazing_status set (security_invoker = true);

create or replace function check_grazing_rest(
  p_field_id uuid,
  p_row_id uuid,
  p_start_date date default current_date,
  p_rest_days int default 25
) returns table (
  grazing_event_id uuid,
  last_grazed_end date,
  days_rested int
) language sql stable security invoker set search_path = public as $$
  select id, coalesce(end_date, start_date), (p_start_date - coalesce(end_date, start_date))::int
  from grazing_events
  where field_id = p_field_id
    and row_id is not distinct from p_row_id
    and coalesce(end_date, start_date) < p_start_date
    and (p_start_date - coalesce(end_date, start_date)) < p_rest_days
  order by coalesce(end_date, start_date) desc
  limit 1
$$;

alter table grazing_events enable row level security;

drop policy if exists grazing_events_select on grazing_events;
create policy grazing_events_select on grazing_events for select using (is_org_member(org_id));
drop policy if exists grazing_events_write on grazing_events;
create policy grazing_events_write on grazing_events for insert with check (is_org_editor(org_id));
drop policy if exists grazing_events_update on grazing_events;
create policy grazing_events_update on grazing_events for update using (is_org_editor(org_id));
drop policy if exists grazing_events_delete on grazing_events;
create policy grazing_events_delete on grazing_events for delete using (is_org_editor(org_id));

grant select, insert, update, delete on grazing_events to authenticated;
grant select on grazing_status to authenticated;
revoke all on grazing_events, grazing_status from anon;
