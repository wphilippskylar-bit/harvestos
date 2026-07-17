-- Harvest OS — initial schema
-- Multi-tenant from day one: every business table hangs off org_id.
-- One person can belong to multiple orgs (memberships), with a role per org.

create extension if not exists "pgcrypto";

-- ============================================================
-- ORGANIZATIONS & MEMBERSHIP (multi-tenant + future licensing)
-- ============================================================

create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  plan_tier text not null default 'free' check (plan_tier in ('free','starter','growth','scale')),
  seat_limit int not null default 3,           -- free/self tier; starter=10 ($15), growth=25 ($30), scale=50 ($55)
  batch_id_prefix text not null default 'B',   -- used by auto batch-id generator, editable per org
  created_at timestamptz not null default now()
);

create table memberships (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','admin','member','viewer')),
  -- owner: full control incl. billing/invites. admin: manage data + invite members.
  -- member: enter/edit data, no invite/billing. viewer: read-only.
  created_at timestamptz not null default now(),
  unique (org_id, user_id)
);

create index memberships_user_idx on memberships(user_id);
create index memberships_org_idx on memberships(org_id);

-- helper: does the current user belong to org X, and with what role
create or replace function current_user_role(target_org uuid)
returns text language sql stable security definer set search_path = public as $$
  select role from memberships where org_id = target_org and user_id = auth.uid()
$$;

create or replace function is_org_member(target_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from memberships where org_id = target_org and user_id = auth.uid())
$$;

create or replace function is_org_editor(target_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from memberships
    where org_id = target_org and user_id = auth.uid() and role in ('owner','admin','member')
  )
$$;

-- ============================================================
-- CROPS (protocol library — grow parameters + harvest/packaging)
-- ============================================================

create table crops (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  seed_type text,
  sterilization text,
  presoak text,
  mat_setup text,
  weight_dome text,
  blackout_days text,
  light_days text,
  total_cycle_days_min int,
  total_cycle_days_max int,
  watering_schedule text,
  kelp_schedule text,
  tent_zone_temp text,
  harvest_window text,
  cut_height text,
  washing text,
  drying text,
  packaging text default 'Clamshell',
  storage_temp text default '36-40F',
  sow_rate_g numeric,
  seed_cost_per_g numeric,        -- rolling avg, editable; also derivable from purchases
  is_premium boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index crops_org_idx on crops(org_id);

-- ============================================================
-- BATCHES (auto-generated OR manually entered/edited batch id)
-- ============================================================

create sequence if not exists batch_seq;

create table batches (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  batch_id text not null,              -- human-facing, editable, unique per org
  crop_id uuid references crops(id),
  crop_name_snapshot text,             -- kept even if crop later renamed/deleted
  plant_date date not null default current_date,
  harvest_date date,
  days_to_maturity int,
  tray_amount int not null default 1,
  rack_location text,
  substrate text default 'hemp mat',
  dry_seed_weight_g numeric,
  fresh_harvest_weight_g numeric,
  waste_mass_g numeric,
  mat_cost_per_tray numeric,
  total_unit_cost numeric,             -- computed client-side from seed+mat+packaging, stored for history
  sales_price_per_oz numeric,
  yield_ratio numeric,                 -- fresh_harvest_weight_g / dry_seed_weight_g, computed
  status text not null default 'planted' check (status in ('planted','growing','harvested','sold_out','composted')),
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, batch_id)
);

create index batches_org_idx on batches(org_id);
create index batches_status_idx on batches(org_id, status);

-- auto-generate a batch id like "B-20260716-001" if none supplied
create or replace function next_batch_id(target_org uuid)
returns text language plpgsql security definer set search_path = public as $$
declare
  prefix text;
  today text := to_char(current_date, 'YYYYMMDD');
  seq_num int;
  candidate text;
begin
  select batch_id_prefix into prefix from organizations where id = target_org;
  select count(*) + 1 into seq_num from batches
    where org_id = target_org and batch_id like (prefix || '-' || today || '-%');
  candidate := prefix || '-' || today || '-' || lpad(seq_num::text, 3, '0');
  return candidate;
end;
$$;

-- ============================================================
-- PURCHASES (expense log)
-- ============================================================

create table purchases (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  purchase_date date not null default current_date,
  item text not null,
  category text not null default 'Other' check (category in
    ('Seeds','Trays','Medium','Equipment','Supplies','Packaging','Rent','Utilities','Insurance','Marketing','Other')),
  amount_qty text,           -- free text like "5lbs" or "1 unit" to match his sheet
  vendor text,
  location text,
  cost numeric not null default 0,
  tax numeric not null default 0,
  shipping numeric not null default 0,
  total numeric generated always as (cost + tax + shipping) stored,
  reason text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index purchases_org_idx on purchases(org_id, purchase_date desc);

-- ============================================================
-- SALES CHANNELS (the requested tracker: untried / attempted / in progress / active)
-- ============================================================

create table sales_channels (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  channel_type text not null default 'restaurant' check (channel_type in
    ('restaurant','farmers_market','csa','wholesale','direct','grocery','other')),
  status text not null default 'untried' check (status in ('untried','attempted','in_progress','active','paused')),
  area text,
  contact_name text,
  contact_info text,
  pitch_notes text,          -- what to sell them / selling point
  last_contact_date date,
  next_action text,
  next_action_date date,
  priority int not null default 2,  -- 1=high,2=med,3=low
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index channels_org_status_idx on sales_channels(org_id, status);

-- ============================================================
-- SALES (revenue log)
-- ============================================================

create table sales (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  sale_date date not null default current_date,
  batch_id uuid references batches(id),
  crop_id uuid references crops(id),
  channel_id uuid references sales_channels(id),
  unit text not null default 'tray' check (unit in ('tray','oz','clamshell','lb','live_tray')),
  quantity numeric not null default 0,
  unit_price numeric not null default 0,
  total_revenue numeric generated always as (quantity * unit_price) stored,
  customer_name text,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index sales_org_idx on sales(org_id, sale_date desc);
create index sales_channel_idx on sales(channel_id);

-- ============================================================
-- ENVIRONMENTAL LOGS
-- ============================================================

create table environmental_logs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  batch_id uuid references batches(id),
  log_date date not null default current_date,
  time_of_day text,
  temperature_f numeric,
  humidity_pct numeric,
  vpd_kpa numeric,
  light_schedule_hours numeric,
  light_intensity_ppfd numeric,
  watering_volume_ml numeric,
  water_ph numeric,
  nutrients_supplements text,
  pest_observations text,
  disease_observations text,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index envlogs_org_idx on environmental_logs(org_id, log_date desc);

-- ============================================================
-- GOALS (the "console" tab — structured goal tracker, no AI)
-- ============================================================

create table goals (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  title text not null,
  metric_type text not null default 'custom' check (metric_type in
    ('revenue','trays_sold_week','take_home_month','accounts_active','custom')),
  target_value numeric not null,
  target_date date,
  current_value numeric not null default 0,   -- manually updated OR refreshed by a query the UI runs
  auto_track boolean not null default false,   -- if true, UI computes current_value from sales/channels
  status text not null default 'active' check (status in ('active','hit','missed','paused')),
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index goals_org_idx on goals(org_id, status);

-- ============================================================
-- ROW LEVEL SECURITY — every table isolated by org membership
-- ============================================================

alter table organizations enable row level security;
alter table memberships enable row level security;
alter table crops enable row level security;
alter table batches enable row level security;
alter table purchases enable row level security;
alter table sales_channels enable row level security;
alter table sales enable row level security;
alter table environmental_logs enable row level security;
alter table goals enable row level security;

-- organizations: visible to members; only owners can update org settings (incl. future billing fields)
create policy org_select on organizations for select using (is_org_member(id));
create policy org_insert on organizations for insert with check (true); -- created via signup flow, membership added after
create policy org_update_owner on organizations for update using (current_user_role(id) = 'owner');

-- memberships: visible to org members; owners/admins can manage; a user can always see their own row
create policy membership_select on memberships for select using (is_org_member(org_id) or user_id = auth.uid());
create policy membership_insert_owner on memberships for insert with check (
  user_id = auth.uid() -- self-join at signup (first membership creates the org as owner, enforced in app logic)
  or current_user_role(org_id) in ('owner','admin')
);
create policy membership_update_owner on memberships for update using (current_user_role(org_id) in ('owner','admin'));
create policy membership_delete_owner on memberships for delete using (current_user_role(org_id) in ('owner','admin'));

-- generic per-org policy for the business tables: members can read, editors (owner/admin/member) can write
create policy crops_select on crops for select using (is_org_member(org_id));
create policy crops_write on crops for insert with check (is_org_editor(org_id));
create policy crops_update on crops for update using (is_org_editor(org_id));
create policy crops_delete on crops for delete using (is_org_editor(org_id));

create policy batches_select on batches for select using (is_org_member(org_id));
create policy batches_write on batches for insert with check (is_org_editor(org_id));
create policy batches_update on batches for update using (is_org_editor(org_id));
create policy batches_delete on batches for delete using (is_org_editor(org_id));

create policy purchases_select on purchases for select using (is_org_member(org_id));
create policy purchases_write on purchases for insert with check (is_org_editor(org_id));
create policy purchases_update on purchases for update using (is_org_editor(org_id));
create policy purchases_delete on purchases for delete using (is_org_editor(org_id));

create policy channels_select on sales_channels for select using (is_org_member(org_id));
create policy channels_write on sales_channels for insert with check (is_org_editor(org_id));
create policy channels_update on sales_channels for update using (is_org_editor(org_id));
create policy channels_delete on sales_channels for delete using (is_org_editor(org_id));

create policy sales_select on sales for select using (is_org_member(org_id));
create policy sales_write on sales for insert with check (is_org_editor(org_id));
create policy sales_update on sales for update using (is_org_editor(org_id));
create policy sales_delete on sales for delete using (is_org_editor(org_id));

create policy envlogs_select on environmental_logs for select using (is_org_member(org_id));
create policy envlogs_write on environmental_logs for insert with check (is_org_editor(org_id));
create policy envlogs_update on environmental_logs for update using (is_org_editor(org_id));
create policy envlogs_delete on environmental_logs for delete using (is_org_editor(org_id));

create policy goals_select on goals for select using (is_org_member(org_id));
create policy goals_write on goals for insert with check (is_org_editor(org_id));
create policy goals_update on goals for update using (is_org_editor(org_id));
create policy goals_delete on goals for delete using (is_org_editor(org_id));

-- ============================================================
-- VIEWS — quarterly / monthly P&L computed live (never manually re-typed)
-- ============================================================

create or replace view monthly_pnl as
select
  o.id as org_id,
  date_trunc('month', coalesce(s.sale_date, p.purchase_date))::date as month,
  coalesce(sum(s.total_revenue), 0) as net_revenue,
  coalesce(sum(p.total), 0) as copex,
  coalesce(sum(s.total_revenue), 0) - coalesce(sum(p.total), 0) as profit
from organizations o
left join sales s on s.org_id = o.id
left join purchases p on p.org_id = o.id
  and date_trunc('month', p.purchase_date) = date_trunc('month', s.sale_date)
group by o.id, date_trunc('month', coalesce(s.sale_date, p.purchase_date));

create or replace view crop_margin as
select
  b.org_id,
  coalesce(b.crop_name_snapshot, c.name) as crop_name,
  count(distinct b.id) as batch_count,
  sum(b.tray_amount) as total_trays,
  avg(b.total_unit_cost) as avg_cost_per_tray,
  coalesce(sum(s.total_revenue), 0) as total_revenue,
  coalesce(sum(s.quantity), 0) as total_sold
from batches b
left join crops c on c.id = b.crop_id
left join sales s on s.batch_id = b.id
group by b.org_id, coalesce(b.crop_name_snapshot, c.name);
