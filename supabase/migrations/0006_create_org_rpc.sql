-- Fixes a real bug hit during Phil's first signup: creating a brand-new organization from
-- the client via `.insert({...}).select().single()` fails RLS, because Postgres checks the
-- org_select policy (is_org_member(id)) on the row being RETURNED, not just the org_insert
-- policy on the row being written — and a brand-new org has no membership linking the creator
-- to it yet (that insert happens next, as a separate call). Postgres reports this as
-- "new row violates row-level security policy for table organizations", which is misleading
-- since the actual INSERT was allowed; it's the implicit RETURNING-as-SELECT check that fails.
--
-- Fix: do both inserts (organization + owner membership) atomically inside one
-- security-definer function, so there's no in-between state where the org exists without
-- its owner membership, and no client-side RETURNING/RLS interaction to trip over.

create or replace function create_organization_with_owner(org_name text, org_slug text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  new_org_id uuid;
begin
  if me is null then
    raise exception 'not authenticated';
  end if;

  insert into organizations (name, slug) values (org_name, org_slug)
  returning id into new_org_id;

  insert into memberships (org_id, user_id, role) values (new_org_id, me, 'owner');

  return new_org_id;
end;
$$;

grant execute on function create_organization_with_owner(text, text) to authenticated;
