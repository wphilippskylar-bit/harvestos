-- Phil: dashboard customization — same self-scoped preference pattern as user_nav_prefs (0020).
-- Each person can hide cards they don't care about and reorder the rest; nothing here is shared
-- farm data, so it's scoped to (user_id, org_id) with no org-editor requirement, same as nav prefs.

create table if not exists user_dashboard_prefs (
  user_id uuid not null references auth.users(id) on delete cascade,
  org_id uuid not null references organizations(id) on delete cascade,
  card_order jsonb not null default '[]'::jsonb,
  hidden_cards jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, org_id)
);

alter table user_dashboard_prefs enable row level security;

drop policy if exists user_dashboard_prefs_select on user_dashboard_prefs;
create policy user_dashboard_prefs_select on user_dashboard_prefs for select using (auth.uid() = user_id);
drop policy if exists user_dashboard_prefs_write on user_dashboard_prefs;
create policy user_dashboard_prefs_write on user_dashboard_prefs for insert with check (auth.uid() = user_id);
drop policy if exists user_dashboard_prefs_update on user_dashboard_prefs;
create policy user_dashboard_prefs_update on user_dashboard_prefs for update using (auth.uid() = user_id);
drop policy if exists user_dashboard_prefs_delete on user_dashboard_prefs;
create policy user_dashboard_prefs_delete on user_dashboard_prefs for delete using (auth.uid() = user_id);

grant select, insert, update, delete on user_dashboard_prefs to authenticated;
revoke all on user_dashboard_prefs from anon;
