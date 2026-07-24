-- Phil: a Schedule/planning tab (freeform tasks, optionally linked to an existing batch/field/CEA
-- area/animal, plannable arbitrarily far out) with configurable notification behavior, plus a
-- separate SOPs (Standard Operating Procedures) tab for reference documents/checklists.

-- ============================================================
-- SCHEDULE EVENTS
-- ============================================================

create table if not exists schedule_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  title text not null,
  notes text,
  event_date date not null,
  event_type text not null default 'other' check (event_type in ('planting','harvest','maintenance','sales','other')),
  status text not null default 'pending' check (status in ('pending','done','skipped')),
  -- Optional link to an existing record — freeform by default, but "harvest Tray Batch #12" can
  -- pull in that batch directly instead of just being a loose text note. Exactly one of these
  -- (or none) should be set; not enforced at the DB level since that's a UI-level concern, same
  -- as how purchases/sales/labor_entries handle their optional field_id/cea_area_id tags.
  batch_id uuid references batches(id) on delete set null,
  field_id uuid references fields(id) on delete set null,
  cea_area_id uuid references cea_areas(id) on delete set null,
  animal_id uuid references animals(id) on delete set null,
  -- Notification behavior for this specific event.
  notify boolean not null default true,
  remind_days_before int not null default 0 check (remind_days_before >= 0),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists schedule_events_org_idx on schedule_events(org_id, event_date);

-- ============================================================
-- SOPs (Standard Operating Procedures) — reference docs/checklists, separate from the day-to-day
-- Schedule so a recurring "how we do X" write-up doesn't get buried in or confused with one-off
-- planned tasks.
-- ============================================================

create table if not exists sops (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  title text not null,
  category text,
  content text not null default '',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sops_org_idx on sops(org_id);

-- ============================================================
-- Org-level notification-grouping preference for Schedule reminders — bundle into the existing
-- daily digest push, send each as its own separate push, or turn schedule notifications off
-- entirely. Same idea as weight_unit/area_unit (0022): an org-wide setting, editable in Settings.
-- ============================================================

alter table organizations add column if not exists schedule_notify_mode text not null default 'digest'
  check (schedule_notify_mode in ('digest','individual','off'));

-- ============================================================
-- RLS — same is_org_member (read) / is_org_editor (write) pattern as every other module
-- ============================================================

alter table schedule_events enable row level security;
alter table sops enable row level security;

drop policy if exists schedule_events_select on schedule_events;
create policy schedule_events_select on schedule_events for select using (is_org_member(org_id));
drop policy if exists schedule_events_write on schedule_events;
create policy schedule_events_write on schedule_events for insert with check (is_org_editor(org_id));
drop policy if exists schedule_events_update on schedule_events;
create policy schedule_events_update on schedule_events for update using (is_org_editor(org_id));
drop policy if exists schedule_events_delete on schedule_events;
create policy schedule_events_delete on schedule_events for delete using (is_org_editor(org_id));

drop policy if exists sops_select on sops;
create policy sops_select on sops for select using (is_org_member(org_id));
drop policy if exists sops_write on sops;
create policy sops_write on sops for insert with check (is_org_editor(org_id));
drop policy if exists sops_update on sops;
create policy sops_update on sops for update using (is_org_editor(org_id));
drop policy if exists sops_delete on sops;
create policy sops_delete on sops for delete using (is_org_editor(org_id));

grant select, insert, update, delete on schedule_events, sops to authenticated;
revoke all on schedule_events, sops from anon;
