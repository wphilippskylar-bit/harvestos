-- Explicit, least-privilege grants for the Data API.
--
-- Supabase changed its default (May 2026): new projects can be created with
-- "Automatically expose new tables" UNCHECKED, meaning a table you create
-- gets NO Data API access until you explicitly grant it — RLS policies alone
-- don't matter if the role can't reach the table at all. This migration
-- makes the app work correctly under that safer default (and is a strict
-- improvement even on projects still using the old auto-expose default),
-- by granting only what's needed, only to `authenticated` — never `anon`.
-- Nothing in this app should ever be readable without logging in, so anon
-- gets nothing.

revoke all on all tables in schema public from anon;
revoke all on all functions in schema public from anon;

grant usage on schema public to authenticated;

grant select, insert, update, delete on
  organizations,
  memberships,
  crops,
  batches,
  purchases,
  sales_channels,
  sales,
  environmental_logs,
  goals,
  org_invites
to authenticated;

-- Views: read-only by nature.
grant select on monthly_pnl, crop_margin to authenticated;

-- RPCs the client calls directly (batch id generation, invites, org seeding,
-- member list with email). Row Level Security inside each function still
-- applies — this just allows the role to invoke them at all.
grant execute on function
  next_batch_id(uuid),
  seed_org_defaults(uuid),
  accept_pending_invites(),
  org_members_with_email(uuid)
to authenticated;

-- Helper functions used inside RLS policy expressions (current_user_role,
-- is_org_member, is_org_editor) don't need explicit grants — Postgres
-- grants EXECUTE on new functions to PUBLIC by default, and they're never
-- called directly from the client — but granting explicitly costs nothing
-- and documents the intent.
grant execute on function
  current_user_role(uuid),
  is_org_member(uuid),
  is_org_editor(uuid)
to authenticated;
