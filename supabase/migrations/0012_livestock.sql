-- Phil: first slice of the livestock/ranching module (deferred from 0011's field-crop work).
-- Spec came from a separate planning conversation: animal records (ear tag, breed, birth date,
-- sire/dam lineage), a per-animal health log, and a withdrawal-period timer/status flag so a
-- rancher can see at a glance whether an animal is safe to sell/milk or still restricted.
--
-- organizations.operation_types already allows 'livestock' as a value (reserved in 0011's check
-- constraint) — this migration is what actually makes it do something: the Livestock nav item,
-- the Animals page, and the Settings toggle all key off it.

-- ============================================================
-- ANIMALS
-- ============================================================

create table if not exists animals (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  ear_tag_number text not null,
  breed text,
  birth_date date,
  sire_id uuid references animals(id) on delete set null,
  dam_id uuid references animals(id) on delete set null,
  status text not null default 'active' check (status in ('active','sold','deceased')),
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, ear_tag_number)
);

create index if not exists animals_org_idx on animals(org_id);

-- ============================================================
-- HEALTH LOG (one animal -> many entries)
-- ============================================================

create table if not exists animal_health_logs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  animal_id uuid not null references animals(id) on delete cascade,
  log_date date not null default current_date,
  treatment_type text not null check (treatment_type in ('vaccine','medication','illness','injury','other')),
  treatment_name text,
  notes text,
  withdrawal_days int,
  -- Auto-calculated from log_date + withdrawal_days, same row only — Postgres generated columns
  -- support this since both inputs live on the row being written.
  withdrawal_end_date date generated always as (
    case when withdrawal_days is not null then log_date + withdrawal_days else null end
  ) stored,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists animal_health_logs_animal_idx on animal_health_logs(animal_id, log_date desc);
create index if not exists animal_health_logs_org_idx on animal_health_logs(org_id);

-- ============================================================
-- Per-animal restriction status — green/red badge, no push notifications yet (v1 per spec:
-- "no need for push notifications or anything fancier yet"). security_invoker so RLS on the
-- underlying tables is always enforced against the querying role, same as crop_inventory.
-- ============================================================

create or replace view animal_status as
select
  a.id as animal_id,
  a.org_id,
  exists (
    select 1 from animal_health_logs h
    where h.animal_id = a.id and h.withdrawal_end_date is not null and h.withdrawal_end_date >= current_date
  ) as restricted,
  (
    select max(h.withdrawal_end_date) from animal_health_logs h
    where h.animal_id = a.id and h.withdrawal_end_date >= current_date
  ) as restricted_until
from animals a;

alter view animal_status set (security_invoker = true);

-- ============================================================
-- RLS — same is_org_member (read) / is_org_editor (write) pattern as fields/plantings/soil_tests
-- ============================================================

alter table animals enable row level security;
alter table animal_health_logs enable row level security;

drop policy if exists animals_select on animals;
create policy animals_select on animals for select using (is_org_member(org_id));
drop policy if exists animals_write on animals;
create policy animals_write on animals for insert with check (is_org_editor(org_id));
drop policy if exists animals_update on animals;
create policy animals_update on animals for update using (is_org_editor(org_id));
drop policy if exists animals_delete on animals;
create policy animals_delete on animals for delete using (is_org_editor(org_id));

drop policy if exists animal_health_logs_select on animal_health_logs;
create policy animal_health_logs_select on animal_health_logs for select using (is_org_member(org_id));
drop policy if exists animal_health_logs_write on animal_health_logs;
create policy animal_health_logs_write on animal_health_logs for insert with check (is_org_editor(org_id));
drop policy if exists animal_health_logs_update on animal_health_logs;
create policy animal_health_logs_update on animal_health_logs for update using (is_org_editor(org_id));
drop policy if exists animal_health_logs_delete on animal_health_logs;
create policy animal_health_logs_delete on animal_health_logs for delete using (is_org_editor(org_id));

grant select, insert, update, delete on animals, animal_health_logs to authenticated;
grant select on animal_status to authenticated;
revoke all on animals, animal_health_logs, animal_status from anon;
