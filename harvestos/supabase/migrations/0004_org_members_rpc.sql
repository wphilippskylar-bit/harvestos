-- The `auth` schema isn't exposed over PostgREST, so the client can't join
-- memberships -> auth.users directly to show member emails in Settings.
-- This function does that join server-side (security definer) and is only
-- callable by members of the org being queried.

create or replace function org_members_with_email(target_org uuid)
returns table (id uuid, user_id uuid, role text, email text, created_at timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  if not is_org_member(target_org) then
    raise exception 'not a member of this organization';
  end if;

  return query
    select m.id, m.user_id, m.role, u.email::text, m.created_at
    from memberships m
    join auth.users u on u.id = m.user_id
    where m.org_id = target_org
    order by m.created_at asc;
end;
$$;

-- Tighten the existing owner/admin update+delete policies from 0001 so an
-- admin can change or remove a member/viewer, but never touch the owner row
-- (Postgres ORs multiple permissive policies together, so this has to replace
-- the originals rather than add a second one alongside them).
drop policy if exists membership_update_owner on memberships;
create policy membership_update_owner on memberships for update using (
  current_user_role(org_id) in ('owner','admin') and role <> 'owner'
) with check (role <> 'owner');

drop policy if exists membership_delete_owner on memberships;
create policy membership_delete_owner on memberships for delete using (
  current_user_role(org_id) in ('owner','admin') and role <> 'owner'
);
