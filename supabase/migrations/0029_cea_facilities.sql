-- Phil: a "facility" layer above CEA areas (rooms) — lets a grower with more than one room see
-- the whole building at a glance (roll-up of every room) as well as drill into a single room the
-- way they already can today. Purely additive: cea_areas.facility_id is nullable, so existing
-- single-room growers see nothing new unless they create a facility.

create table if not exists cea_facilities (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  facility_type text not null default 'building' check (facility_type in ('building','greenhouse_complex','warehouse','other')),
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cea_facilities_org_idx on cea_facilities(org_id);

alter table cea_areas add column if not exists facility_id uuid references cea_facilities(id) on delete set null;
create index if not exists cea_areas_facility_idx on cea_areas(facility_id);

-- RLS — same is_org_member (read) / is_org_editor (write) pattern as the rest of the CEA module.
alter table cea_facilities enable row level security;

drop policy if exists cea_facilities_select on cea_facilities;
create policy cea_facilities_select on cea_facilities for select using (is_org_member(org_id));
drop policy if exists cea_facilities_write on cea_facilities;
create policy cea_facilities_write on cea_facilities for insert with check (is_org_editor(org_id));
drop policy if exists cea_facilities_update on cea_facilities;
create policy cea_facilities_update on cea_facilities for update using (is_org_editor(org_id));
drop policy if exists cea_facilities_delete on cea_facilities;
create policy cea_facilities_delete on cea_facilities for delete using (is_org_editor(org_id));

grant select, insert, update, delete on cea_facilities to authenticated;
revoke all on cea_facilities from anon;
