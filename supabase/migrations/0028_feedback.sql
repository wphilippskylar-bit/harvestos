-- Phil: a lightweight in-app feedback system — beta testers need a fast way to flag bugs or
-- ideas without leaving the app or hunting for an email address. Deliberately simple: one table,
-- a floating widget mounted globally (in app/(app)/layout.tsx), and a view on the existing
-- platform admin page (0014) rather than a whole new moderation UI.

create table if not exists feedback (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  user_email text,
  page_path text,
  category text not null default 'general' check (category in ('bug','idea','general')),
  message text not null,
  status text not null default 'new' check (status in ('new','reviewed','resolved')),
  created_at timestamptz not null default now()
);

create index if not exists feedback_org_idx on feedback(org_id);
create index if not exists feedback_created_idx on feedback(created_at desc);

alter table feedback enable row level security;

-- Any signed-in user can submit feedback (even if their org lookup somehow fails, org_id can be
-- null) — this is intentionally permissive on insert, since the whole point is a low-friction way
-- to report a problem.
create policy feedback_insert on feedback for insert to authenticated
  with check (true);

-- Only platform admins can read feedback — it's not scoped to org membership the way most tables
-- are (a farm shouldn't see another farm's bug reports), and only Phil needs to see all of it.
create policy feedback_select_admin on feedback for select to authenticated
  using (is_platform_admin());

create policy feedback_update_admin on feedback for update to authenticated
  using (is_platform_admin());

revoke all on feedback from anon;
grant select, insert, update on feedback to authenticated;
