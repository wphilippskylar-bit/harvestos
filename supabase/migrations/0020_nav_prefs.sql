-- Phil: lets each user customize their own left-nav order (Dashboard always pinned first, enforced
-- in the frontend, not here) rather than one fixed order for everyone. Purely a per-user, per-org
-- preference — doesn't affect what any other team member sees.

create table if not exists user_nav_prefs (
  user_id uuid not null references auth.users(id) on delete cascade,
  org_id uuid not null references organizations(id) on delete cascade,
  nav_order jsonb not null default '[]'::jsonb, -- ordered array of nav hrefs, e.g. ["/batches","/purchases",...]
  updated_at timestamptz not null default now(),
  primary key (user_id, org_id)
);

alter table user_nav_prefs enable row level security;

-- Self-scoped only — a user reads/writes their own row and nobody else's, no org-editor check
-- needed since this never touches shared farm data, just one person's UI preference.
drop policy if exists user_nav_prefs_select on user_nav_prefs;
create policy user_nav_prefs_select on user_nav_prefs for select using (auth.uid() = user_id);
drop policy if exists user_nav_prefs_upsert on user_nav_prefs;
create policy user_nav_prefs_upsert on user_nav_prefs for insert with check (auth.uid() = user_id);
drop policy if exists user_nav_prefs_update on user_nav_prefs;
create policy user_nav_prefs_update on user_nav_prefs for update using (auth.uid() = user_id);

grant select, insert, update on user_nav_prefs to authenticated;
revoke all on user_nav_prefs from anon;
