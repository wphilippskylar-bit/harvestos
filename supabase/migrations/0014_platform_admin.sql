-- Phil: cross-farm aggregate reporting for institutional partners (OSU Extension, Chickasaw Nation
-- Ag, USDA/NRCS) — the "A. Role-Based Access Control & Multi-Tenancy" gap identified when
-- comparing Harvest OS against what those partners actually need to see. Every org already has
-- its own owner/admin/member/viewer roles (0001-onward) — that's a solo-farm view. What's new here
-- is a *platform-level* role that sits above every org and can see totals across all of them,
-- without ever seeing any individual farm's financial data (no revenue, no costs, no P&L — only
-- adoption/impact counts: how many farms, how many acres, how many head of livestock, how many
-- trays grown). This is deliberately a narrow, anonymized aggregate view, not an admin backdoor
-- into every farm's private data.
--
-- Also adds seed_demo_org(), a generic (not Phil's real ACF protocol data) sample-data seeder for
-- creating a throwaway test account other AI tools/reviewers can log into.

create table if not exists platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  granted_at timestamptz not null default now()
);

alter table platform_admins enable row level security;
-- Deliberately no policies — nobody can read/write this table through the normal Data API, even
-- themselves. It's only ever consulted from inside the security-definer function below, which
-- runs as the function owner and isn't subject to RLS. Managing membership is a manual SQL Editor
-- action (insert your own user id once, see README), not an in-app feature — this is a small,
-- trusted list, not something to expose a UI for yet.
revoke all on platform_admins from anon, authenticated;

create or replace function is_platform_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from platform_admins where user_id = auth.uid());
$$;

grant execute on function is_platform_admin() to authenticated;

-- Aggregate, anonymized counts across every org on the platform. security definer so it can see
-- across org boundaries (necessarily bypassing per-org RLS), but it checks is_platform_admin()
-- itself and raises if the caller isn't one — so this is gated at the function level, not by table
-- grants. Only ever returns counts/sums, never anything identifying a specific org's financials.
create or replace function platform_aggregate_stats()
returns table (
  total_orgs bigint,
  orgs_with_microgreens bigint,
  orgs_with_field_crop bigint,
  orgs_with_livestock bigint,
  total_fields bigint,
  total_field_acres numeric,
  total_active_plantings bigint,
  total_animals bigint,
  total_active_batches bigint,
  total_grazing_events bigint
) language plpgsql security definer set search_path = public as $$
begin
  if not is_platform_admin() then
    raise exception 'not authorized';
  end if;

  return query
  select
    (select count(*) from organizations),
    (select count(*) from organizations where 'microgreens' = any(operation_types)),
    (select count(*) from organizations where 'field_crop' = any(operation_types)),
    (select count(*) from organizations where 'livestock' = any(operation_types)),
    (select count(*) from fields),
    (select coalesce(sum(acreage), 0) from fields),
    (select count(*) from plantings where status in ('planted', 'growing')),
    (select count(*) from animals where status = 'active'),
    (select count(*) from batches where status in ('germinating', 'growing')),
    (select count(*) from grazing_events);
end;
$$;

grant execute on function platform_aggregate_stats() to authenticated;

-- A bare org roster (name + which modules they use + when they joined) for the admin view's
-- "farms on the platform" list — deliberately excludes anything financial. Same
-- gate-inside-the-function pattern as above.
create or replace function platform_org_roster()
returns table (
  org_id uuid,
  org_name text,
  operation_types text[],
  created_at timestamptz
) language plpgsql security definer set search_path = public as $$
begin
  if not is_platform_admin() then
    raise exception 'not authorized';
  end if;

  return query select o.id, o.name, o.operation_types, o.created_at from organizations o order by o.created_at desc;
end;
$$;

grant execute on function platform_org_roster() to authenticated;

-- ============================================================
-- Generic demo-data seeder for a throwaway test/reviewer account. Deliberately NOT Phil's real
-- ACF grow-protocol data (that's proprietary and lives in seed_org_defaults, 0002) — this is
-- generic sample data across every module (crops, fields, livestock, grazing, purchases, sales)
-- so an outside reviewer (or another AI) logging into a test account sees the whole app populated,
-- without seeing Phil's actual business numbers.
-- ============================================================

create or replace function seed_demo_org(target_org uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_broccoli uuid;
  v_lettuce uuid;
  v_field uuid;
  v_animal1 uuid;
  v_animal2 uuid;
begin
  update organizations set operation_types = array['microgreens','field_crop','livestock']
  where id = target_org;

  insert into crops (org_id, name, crop_family, applicable_to, sow_rate_g, low_stock_threshold_trays, oz_per_tray, is_premium)
  values (target_org, 'Broccoli Microgreens', 'Brassicaceae', array['microgreens'], 25, 5, 4, false)
  returning id into v_broccoli;

  insert into crops (org_id, name, crop_family, applicable_to)
  values (target_org, 'Lettuce (Field)', 'Asteraceae', array['field_crop'])
  returning id into v_lettuce;

  insert into fields (org_id, name, is_high_tunnel, acreage, notes)
  values (target_org, 'Demo North Field', false, 2.5, 'Sample field for reviewer walkthrough')
  returning id into v_field;

  insert into plantings (org_id, field_id, crop_id, crop_name_snapshot, crop_family_snapshot, planted_date, status)
  values (target_org, v_field, v_lettuce, 'Lettuce (Field)', 'Asteraceae', current_date - 20, 'growing');

  insert into animals (org_id, ear_tag_number, breed, birth_date, status, notes)
  values (target_org, 'DEMO-001', 'Angus', current_date - 400, 'active', 'Sample animal for reviewer walkthrough')
  returning id into v_animal1;
  insert into animals (org_id, ear_tag_number, breed, birth_date, status)
  values (target_org, 'DEMO-002', 'Hereford', current_date - 220, 'active')
  returning id into v_animal2;

  insert into animal_health_logs (org_id, animal_id, log_date, treatment_type, treatment_name, withdrawal_days, notes)
  values (target_org, v_animal1, current_date - 5, 'vaccine', 'Sample vaccine', 21, 'Demo entry showing an active withdrawal period');

  insert into grazing_events (org_id, field_id, start_date, animal_notes)
  values (target_org, v_field, current_date - 3, 'Both demo animals, main herd');

  insert into batches (org_id, batch_id, crop_id, plant_date, tray_amount, status)
  values (target_org, 'DEMO-' || to_char(current_date, 'YYYYMMDD') || '-001', v_broccoli, current_date - 6, 4, 'growing');

  insert into purchases (org_id, item, category, cost, purchase_date, crop_id, seed_weight_g)
  values (target_org, 'Broccoli seed', 'Seeds', 24.50, current_date - 10, v_broccoli, 500);

  insert into sales_channels (org_id, name, channel_type, status, area, priority)
  values (target_org, 'Demo Farmers Market', 'farmers_market', 'active', 'Demo City', 1);
end;
$$;

grant execute on function seed_demo_org(uuid) to authenticated;
