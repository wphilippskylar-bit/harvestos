-- Lightweight invite flow: no email-sending service required.
-- Owner/admin adds an email + role to org_invites. When that person signs up
-- (or logs in for the first time) with a matching email, the app auto-creates
-- their membership at the specified role and marks the invite accepted.

create table org_invites (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  email text not null,
  role text not null default 'member' check (role in ('admin','member','viewer')), -- never invite as owner
  invited_by uuid references auth.users(id),
  accepted boolean not null default false,
  created_at timestamptz not null default now(),
  unique (org_id, email)
);

create index org_invites_email_idx on org_invites(email);

alter table org_invites enable row level security;

create policy invites_select on org_invites for select using (
  is_org_member(org_id) or email = (select email from auth.users where id = auth.uid())
);
create policy invites_insert on org_invites for insert with check (current_user_role(org_id) in ('owner','admin'));
create policy invites_update on org_invites for update using (
  current_user_role(org_id) in ('owner','admin')
  or email = (select email from auth.users where id = auth.uid())
);
create policy invites_delete on org_invites for delete using (current_user_role(org_id) in ('owner','admin'));

-- Called right after a user signs up or logs in: joins any org they were invited to.
create or replace function accept_pending_invites()
returns void language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  my_email text;
  inv record;
begin
  select email into my_email from auth.users where id = me;
  if my_email is null then return; end if;

  for inv in select * from org_invites where email = my_email and accepted = false loop
    insert into memberships (org_id, user_id, role)
    values (inv.org_id, me, inv.role)
    on conflict (org_id, user_id) do nothing;

    update org_invites set accepted = true where id = inv.id;
  end loop;
end;
$$;
