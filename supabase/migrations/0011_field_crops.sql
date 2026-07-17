-- Phil: expand Harvest OS beyond microgreens into field/commercial/urban/indoor crop farming,
-- as the first slice of a broader multi-vertical platform (livestock and cannabis-specific
-- compliance tracking are explicitly deferred — see the project's platform-expansion concept doc).
--
-- Design: reuse everything that isn't microgreens-specific (organizations, memberships, RLS
-- patterns, Purchases, Sales, Settings) and add a parallel "field crop" tracking module alongside
-- the existing microgreens Batches module. An org can run either or both — nothing here removes
-- or restricts Batches.
--
-- New concepts:
--   1. organizations.operation_types — which module(s) an org uses (drives nav + the home
--      dashboard's crop/livestock split Phil described; livestock isn't built yet but the value is
--      reserved so a future migration can add it without an org-level schema change).
--   2. crops.crop_family / crops.applicable_to — the existing Crop Library now doubles as the
--      library for field crops too; crop_family is what powers the rotation-warning check below,
--      applicable_to lets the Batches crop-picker and the field-crop planting-picker each show only
--      the crops relevant to them.
--   3. fields / field_rows — a field, optionally divided into rows/beds; a field with no rows is
--      tracked as a single whole-field unit, matching Phil's "select whole field OR per-row" spec.
--      is_high_tunnel flags a field for separate microclimate tracking, per Phil's explicit ask.
--   4. plantings — the field-crop equivalent of a microgreens "batch": one crop, in one
--      field/row, over one growing cycle.
--   5. soil_tests — photo/document capture with AI-assisted auto-fill into structured fields,
--      always manually editable (OCR/vision extraction is best-effort, never authoritative).
--   6. nutrient_applications — a simple dated log of what was applied to a field/row.
--   7. check_rotation_conflict() — looks up whether the same crop/crop-family was planted in the
--      same field/row within a lookback window (3 years default), for the dismissible
--      rotation-warning banner Phil asked for. Informational only — never blocks a save.

alter table organizations add column if not exists operation_types text[] not null default '{microgreens}';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'organizations_operation_types_check'
  ) then
    alter table organizations add constraint organizations_operation_types_check
      check (operation_types <@ array['microgreens','field_crop','livestock']::text[]);
  end if;
end $$;

alter table crops add column if not exists crop_family text;
alter table crops add column if not exists applicable_to text[] not null default '{microgreens}';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'crops_applicable_to_check'
  ) then
    alter table crops add constraint crops_applicable_to_check
      check (applicable_to <@ array['microgreens','field_crop']::text[]);
  end if;
end $$;

-- ============================================================
-- FIELDS + ROWS
-- ============================================================

create table if not exists fields (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  is_high_tunnel boolean not null default false,
  acreage numeric,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists fields_org_idx on fields(org_id);

-- A field with zero rows is tracked as a single whole-field unit (plantings reference the field
-- directly with row_id null). Rows are opt-in, for growers who want per-bed/per-row granularity.
create table if not exists field_rows (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  field_id uuid not null references fields(id) on delete cascade,
  label text not null,
  created_at timestamptz not null default now()
);

create index if not exists field_rows_field_idx on field_rows(field_id);

-- ============================================================
-- PLANTINGS (field-crop equivalent of a microgreens batch)
-- ============================================================

create table if not exists plantings (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  field_id uuid not null references fields(id) on delete cascade,
  row_id uuid references field_rows(id) on delete set null,
  crop_id uuid references crops(id),
  crop_name_snapshot text,
  crop_family_snapshot text,
  planted_date date not null default current_date,
  expected_harvest_date date,
  harvest_date date,
  status text not null default 'planted' check (status in ('planted','growing','harvested','failed')),
  yield_amount numeric,
  yield_unit text,
  rotation_warning_acknowledged boolean not null default false,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists plantings_org_idx on plantings(org_id);
create index if not exists plantings_field_idx on plantings(field_id, row_id);

-- Looks up whether the same crop or crop family was planted in this field/row within the lookback
-- window, for the dismissible rotation-warning banner. Read-only, security invoker (runs as the
-- calling user so RLS on plantings still applies — a user only ever sees rotation conflicts within
-- their own org's data, same as everything else).
create or replace function check_rotation_conflict(
  p_field_id uuid,
  p_row_id uuid,
  p_crop_family text,
  p_lookback_years int default 3
) returns table (
  planting_id uuid,
  crop_name_snapshot text,
  planted_date date
) language sql stable security invoker set search_path = public as $$
  select id, crop_name_snapshot, planted_date
  from plantings
  where field_id = p_field_id
    and row_id is not distinct from p_row_id
    and crop_family_snapshot is not null
    and p_crop_family is not null
    and crop_family_snapshot = p_crop_family
    and planted_date >= (current_date - (p_lookback_years || ' years')::interval)
  order by planted_date desc
  limit 5;
$$;

grant execute on function check_rotation_conflict(uuid, uuid, text, int) to authenticated;

-- ============================================================
-- SOIL TESTS (photo/document capture, AI-assisted auto-fill, always editable)
-- ============================================================

create table if not exists soil_tests (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  field_id uuid not null references fields(id) on delete cascade,
  row_id uuid references field_rows(id) on delete set null,
  test_date date not null default current_date,
  photo_url text,
  ph numeric,
  nitrogen_ppm numeric,
  phosphorus_ppm numeric,
  potassium_ppm numeric,
  organic_matter_pct numeric,
  raw_extraction jsonb,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists soil_tests_field_idx on soil_tests(field_id);

-- ============================================================
-- NUTRIENT APPLICATIONS (field-crop side of "nutrient and feed" — livestock feed logging is a
-- separate, not-yet-built module since livestock itself is deferred)
-- ============================================================

create table if not exists nutrient_applications (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  field_id uuid not null references fields(id) on delete cascade,
  row_id uuid references field_rows(id) on delete set null,
  applied_date date not null default current_date,
  product_name text not null,
  application_rate text,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists nutrient_applications_field_idx on nutrient_applications(field_id);

-- ============================================================
-- RLS — same is_org_member (read) / is_org_editor (write) pattern as crops/batches/purchases/etc.
-- ============================================================

alter table fields enable row level security;
alter table field_rows enable row level security;
alter table plantings enable row level security;
alter table soil_tests enable row level security;
alter table nutrient_applications enable row level security;

drop policy if exists fields_select on fields;
create policy fields_select on fields for select using (is_org_member(org_id));
drop policy if exists fields_write on fields;
create policy fields_write on fields for insert with check (is_org_editor(org_id));
drop policy if exists fields_update on fields;
create policy fields_update on fields for update using (is_org_editor(org_id));
drop policy if exists fields_delete on fields;
create policy fields_delete on fields for delete using (is_org_editor(org_id));

drop policy if exists field_rows_select on field_rows;
create policy field_rows_select on field_rows for select using (is_org_member(org_id));
drop policy if exists field_rows_write on field_rows;
create policy field_rows_write on field_rows for insert with check (is_org_editor(org_id));
drop policy if exists field_rows_update on field_rows;
create policy field_rows_update on field_rows for update using (is_org_editor(org_id));
drop policy if exists field_rows_delete on field_rows;
create policy field_rows_delete on field_rows for delete using (is_org_editor(org_id));

drop policy if exists plantings_select on plantings;
create policy plantings_select on plantings for select using (is_org_member(org_id));
drop policy if exists plantings_write on plantings;
create policy plantings_write on plantings for insert with check (is_org_editor(org_id));
drop policy if exists plantings_update on plantings;
create policy plantings_update on plantings for update using (is_org_editor(org_id));
drop policy if exists plantings_delete on plantings;
create policy plantings_delete on plantings for delete using (is_org_editor(org_id));

drop policy if exists soil_tests_select on soil_tests;
create policy soil_tests_select on soil_tests for select using (is_org_member(org_id));
drop policy if exists soil_tests_write on soil_tests;
create policy soil_tests_write on soil_tests for insert with check (is_org_editor(org_id));
drop policy if exists soil_tests_update on soil_tests;
create policy soil_tests_update on soil_tests for update using (is_org_editor(org_id));
drop policy if exists soil_tests_delete on soil_tests;
create policy soil_tests_delete on soil_tests for delete using (is_org_editor(org_id));

drop policy if exists nutrient_applications_select on nutrient_applications;
create policy nutrient_applications_select on nutrient_applications for select using (is_org_member(org_id));
drop policy if exists nutrient_applications_write on nutrient_applications;
create policy nutrient_applications_write on nutrient_applications for insert with check (is_org_editor(org_id));
drop policy if exists nutrient_applications_update on nutrient_applications;
create policy nutrient_applications_update on nutrient_applications for update using (is_org_editor(org_id));
drop policy if exists nutrient_applications_delete on nutrient_applications;
create policy nutrient_applications_delete on nutrient_applications for delete using (is_org_editor(org_id));

grant select, insert, update, delete on fields, field_rows, plantings, soil_tests, nutrient_applications to authenticated;

-- ============================================================
-- Storage bucket for soil test photos — same private, org-scoped-folder pattern as harvest-photos
-- ============================================================

insert into storage.buckets (id, name, public)
values ('soil-tests', 'soil-tests', false)
on conflict (id) do nothing;

drop policy if exists soil_test_photos_select on storage.objects;
create policy soil_test_photos_select on storage.objects
  for select using (
    bucket_id = 'soil-tests'
    and is_org_member((storage.foldername(name))[1]::uuid)
  );

drop policy if exists soil_test_photos_insert on storage.objects;
create policy soil_test_photos_insert on storage.objects
  for insert with check (
    bucket_id = 'soil-tests'
    and is_org_editor((storage.foldername(name))[1]::uuid)
  );

drop policy if exists soil_test_photos_delete on storage.objects;
create policy soil_test_photos_delete on storage.objects
  for delete using (
    bucket_id = 'soil-tests'
    and is_org_editor((storage.foldername(name))[1]::uuid)
  );
