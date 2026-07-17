-- Inventory system + Batches/Crop Library upgrades, per Phil's request:
--   - a real Inventory page (seed grams on hand + harvested-crop ounces on hand, per crop)
--   - Purchases (seed purchases) automatically ADD to seed inventory
--   - Batches automatically CONSUME seed inventory when started, and ADD harvested-crop
--     inventory when marked harvested
--   - Sales automatically CONSUME harvested-crop inventory
--   - editing or deleting a batch/purchase/sale correctly reverses its inventory effect
--   - Crop Library becomes editable (owner + admin can edit; owner only can delete; anyone
--     who can already add data can add new crops) and gains sow-rate / low-stock-threshold /
--     unit-conversion fields
--   - Batches status "planted" renamed to "germinating"
--
-- Design: an append-only ledger (inventory_movements), one row per event, rather than a
-- mutable "current stock" number. Every movement is tagged with the row that caused it
-- (source_table/source_id). Purchases/Batches/Sales each get a trigger that deletes and
-- re-inserts that source's movement row(s) on every INSERT/UPDATE, and deletes them on
-- DELETE — so editing a batch's dry seed weight, or deleting it entirely, automatically
-- keeps inventory correct with no app-side bookkeeping. Balance for any crop is just
-- SUM(delta), computed live in the crop_inventory view.

-- ============================================================
-- 1. New columns
-- ============================================================

alter table crops add column if not exists low_stock_threshold_trays numeric;
alter table crops add column if not exists oz_per_tray numeric;
alter table crops add column if not exists oz_per_clamshell numeric;

alter table purchases add column if not exists crop_id uuid references crops(id);
alter table purchases add column if not exists seed_weight_g numeric;

-- ============================================================
-- 2. Sow-rate defaults for Phil's existing 14 crops
--
-- These are standard published per-10x20-tray sow-rate figures (the kind of numbers on a
-- Bootstrap-Farmer-style cheat sheet) used only to unblock the field until Phil enters his
-- own numbers from his actual cheat sheet (Bootstrap Farmer / Jonah / Donny) — every value
-- below is editable any time from the Crop Library page. Only fills in crops that don't
-- already have a sow_rate_g set, so this is safe to re-run.
-- ============================================================

update crops set sow_rate_g = 20  where name = 'Broccoli (Waltham 29)' and sow_rate_g is null; -- estimate
update crops set sow_rate_g = 25  where name = 'Radish (Daikon Minowase)' and sow_rate_g is null; -- estimate
update crops set sow_rate_g = 25  where name = 'Radish (Rambo Purple, organic)' and sow_rate_g is null; -- estimate
update crops set sow_rate_g = 175 where name = 'Lentils' and sow_rate_g is null; -- estimate
update crops set sow_rate_g = 200 where name = 'Sunflower (Black Oil)' and sow_rate_g is null; -- estimate
update crops set sow_rate_g = 225 where name = 'Peas (Speckled)' and sow_rate_g is null; -- estimate
update crops set sow_rate_g = 25  where name = 'Bull''s Blood Beet' and sow_rate_g is null; -- estimate
update crops set sow_rate_g = 30  where name = 'Cilantro' and sow_rate_g is null; -- estimate
update crops set sow_rate_g = 12  where name = 'Arugula (Slow Bolt)' and sow_rate_g is null; -- estimate
update crops set sow_rate_g = 15  where name = 'Kale (Red Russian)' and sow_rate_g is null; -- estimate
update crops set sow_rate_g = 10  where name = 'Mustard (Japanese Red Giant)' and sow_rate_g is null; -- estimate
update crops set sow_rate_g = 8   where name = 'Amaranth' and sow_rate_g is null; -- estimate
update crops set sow_rate_g = 300 where name = 'Wheatgrass' and sow_rate_g is null; -- estimate
update crops set sow_rate_g = 8   where name = 'Basil' and sow_rate_g is null; -- estimate

-- ============================================================
-- 3. Batches: "planted" -> "germinating"
-- ============================================================

-- Drop whatever check constraint(s) currently enforce batches.status FIRST — dynamically, by
-- lookup rather than assuming the name is exactly "batches_status_check" (if it's ever named
-- something else, an assumed-name drop would silently no-op and leave the OLD constraint in
-- place alongside a new one, and Postgres requires ALL check constraints on a row to pass).
-- This has to happen BEFORE the rename below: the column must be unconstrained while any
-- existing 'planted' rows get renamed to 'germinating', otherwise that UPDATE itself gets
-- rejected by the OLD constraint (which has never heard of 'germinating') before this script
-- ever reaches the point of fixing it — which, since Supabase's SQL Editor runs a pasted
-- script as one transaction, would silently roll back everything else in this migration too.
do $$
declare r record;
begin
  for r in
    select conname from pg_constraint
    where conrelid = 'batches'::regclass and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%status%'
  loop
    execute format('alter table batches drop constraint %I', r.conname);
  end loop;
end $$;

update batches set status = 'germinating' where status = 'planted';
alter table batches alter column status set default 'germinating';

alter table batches add constraint batches_status_check
  check (status in ('germinating','growing','harvested','sold_out','composted'));

-- Deleting a batch (the new "delete in case you input the wrong thing" feature) must not
-- fail just because a sale or environment log still points at it — unlink instead of
-- blocking the delete, so the sale/log itself (and its revenue/data) is preserved.
alter table sales drop constraint if exists sales_batch_id_fkey;
alter table sales add constraint sales_batch_id_fkey
  foreign key (batch_id) references batches(id) on delete set null;

alter table environmental_logs drop constraint if exists environmental_logs_batch_id_fkey;
alter table environmental_logs add constraint environmental_logs_batch_id_fkey
  foreign key (batch_id) references batches(id) on delete set null;

-- ============================================================
-- 4. Inventory ledger
-- ============================================================

create table if not exists inventory_movements (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  crop_id uuid not null references crops(id) on delete cascade,
  kind text not null check (kind in ('seed_g','harvest_oz')),
  delta numeric not null,   -- positive = added to stock, negative = consumed
  reason text not null check (reason in
    ('purchase','batch_start','harvest','sale','adjustment')),
  source_table text,        -- 'purchases' | 'batches' | 'sales' | null (manual adjustment)
  source_id uuid,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists inv_move_org_crop_idx on inventory_movements(org_id, crop_id, kind);
create index if not exists inv_move_source_idx on inventory_movements(source_table, source_id);

alter table inventory_movements enable row level security;
drop policy if exists inv_move_select on inventory_movements;
create policy inv_move_select on inventory_movements for select using (is_org_member(org_id));
drop policy if exists inv_move_insert on inventory_movements;
create policy inv_move_insert on inventory_movements for insert with check (is_org_editor(org_id));
drop policy if exists inv_move_delete on inventory_movements;
create policy inv_move_delete on inventory_movements for delete using (current_user_role(org_id) = 'owner');
-- No update policy: this is an append-only ledger. Corrections happen as a new
-- 'adjustment' row (insert) or, for a genuine mistake, an owner deleting the bad row.

-- ============================================================
-- 5. Triggers: keep the ledger in sync automatically
-- ============================================================

-- Purchases (seed purchases) -> +seed_g
create or replace function sync_purchase_inventory() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if TG_OP = 'DELETE' then
    delete from inventory_movements where source_table = 'purchases' and source_id = OLD.id;
    return OLD;
  end if;

  delete from inventory_movements where source_table = 'purchases' and source_id = NEW.id;

  if NEW.crop_id is not null and NEW.seed_weight_g is not null and NEW.seed_weight_g > 0 then
    insert into inventory_movements (org_id, crop_id, kind, delta, reason, source_table, source_id, created_by)
    values (NEW.org_id, NEW.crop_id, 'seed_g', NEW.seed_weight_g, 'purchase', 'purchases', NEW.id, NEW.created_by);
  end if;

  return NEW;
end;
$$;

drop trigger if exists purchases_inventory_sync on purchases;
create trigger purchases_inventory_sync
after insert or update or delete on purchases
for each row execute function sync_purchase_inventory();

-- Batches -> -seed_g at start, +harvest_oz once fresh_harvest_weight_g is entered
create or replace function sync_batch_inventory() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if TG_OP = 'DELETE' then
    delete from inventory_movements where source_table = 'batches' and source_id = OLD.id;
    return OLD;
  end if;

  delete from inventory_movements where source_table = 'batches' and source_id = NEW.id;

  if NEW.crop_id is not null and NEW.dry_seed_weight_g is not null and NEW.dry_seed_weight_g > 0 then
    insert into inventory_movements (org_id, crop_id, kind, delta, reason, source_table, source_id, created_by)
    values (NEW.org_id, NEW.crop_id, 'seed_g', -NEW.dry_seed_weight_g, 'batch_start', 'batches', NEW.id, NEW.created_by);
  end if;

  if NEW.crop_id is not null and NEW.fresh_harvest_weight_g is not null and NEW.fresh_harvest_weight_g > 0 then
    insert into inventory_movements (org_id, crop_id, kind, delta, reason, source_table, source_id, created_by)
    values (NEW.org_id, NEW.crop_id, 'harvest_oz', NEW.fresh_harvest_weight_g / 28.349523125, 'harvest', 'batches', NEW.id, NEW.created_by);
  end if;

  return NEW;
end;
$$;

drop trigger if exists batches_inventory_sync on batches;
create trigger batches_inventory_sync
after insert or update or delete on batches
for each row execute function sync_batch_inventory();

-- Sales -> -harvest_oz (oz/lb convert directly; tray/clamshell convert via the crop's
-- oz_per_tray / oz_per_clamshell if set; live_tray sales don't touch harvested-product
-- inventory since nothing was cut/packaged)
create or replace function sync_sale_inventory() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  oz_equiv numeric;
  crop_oz_tray numeric;
  crop_oz_clam numeric;
begin
  if TG_OP = 'DELETE' then
    delete from inventory_movements where source_table = 'sales' and source_id = OLD.id;
    return OLD;
  end if;

  delete from inventory_movements where source_table = 'sales' and source_id = NEW.id;

  if NEW.crop_id is not null then
    oz_equiv := null;
    if NEW.unit = 'oz' then
      oz_equiv := NEW.quantity;
    elsif NEW.unit = 'lb' then
      oz_equiv := NEW.quantity * 16;
    elsif NEW.unit in ('tray','clamshell') then
      select oz_per_tray, oz_per_clamshell into crop_oz_tray, crop_oz_clam from crops where id = NEW.crop_id;
      if NEW.unit = 'tray' and crop_oz_tray is not null then
        oz_equiv := NEW.quantity * crop_oz_tray;
      elsif NEW.unit = 'clamshell' and crop_oz_clam is not null then
        oz_equiv := NEW.quantity * crop_oz_clam;
      end if;
    end if;

    if oz_equiv is not null and oz_equiv > 0 then
      insert into inventory_movements (org_id, crop_id, kind, delta, reason, source_table, source_id, created_by)
      values (NEW.org_id, NEW.crop_id, 'harvest_oz', -oz_equiv, 'sale', 'sales', NEW.id, NEW.created_by);
    end if;
  end if;

  return NEW;
end;
$$;

drop trigger if exists sales_inventory_sync on sales;
create trigger sales_inventory_sync
after insert or update or delete on sales
for each row execute function sync_sale_inventory();

-- ============================================================
-- 6. crop_inventory view — current balances, live
-- ============================================================

create or replace view crop_inventory as
select
  c.id as crop_id,
  c.org_id,
  c.name as crop_name,
  coalesce(sum(m.delta) filter (where m.kind = 'seed_g'), 0) as seed_g_on_hand,
  coalesce(sum(m.delta) filter (where m.kind = 'harvest_oz'), 0) as harvest_oz_on_hand,
  c.sow_rate_g,
  c.low_stock_threshold_trays,
  case when c.sow_rate_g is not null and c.sow_rate_g > 0
    then coalesce(sum(m.delta) filter (where m.kind = 'seed_g'), 0) / c.sow_rate_g
    else null end as sowable_trays_remaining
from crops c
left join inventory_movements m on m.crop_id = c.id
group by c.id, c.org_id, c.name, c.sow_rate_g, c.low_stock_threshold_trays;

-- Hardening (not a fix for an observed leak — just correct-by-construction): make sure
-- these views always run with the querying user's own permissions, never the view
-- owner's, so RLS on the underlying tables is enforced no matter which Postgres role
-- created the view. security_invoker requires Postgres 15+; each attempt is wrapped so
-- that on an older engine it's silently skipped instead of aborting this entire script
-- (Supabase's SQL Editor runs a pasted script as one transaction, so one unsupported
-- statement here would otherwise roll back everything else in this migration too).
do $$
begin
  execute 'alter view crop_inventory set (security_invoker = true)';
exception when others then
  raise notice 'Skipped security_invoker on crop_inventory (likely an older Postgres version) — not required for the app to work.';
end $$;

do $$
begin
  execute 'alter view monthly_pnl set (security_invoker = true)';
exception when others then
  raise notice 'Skipped security_invoker on monthly_pnl (likely an older Postgres version) — not required for the app to work.';
end $$;

do $$
begin
  execute 'alter view crop_margin set (security_invoker = true)';
exception when others then
  raise notice 'Skipped security_invoker on crop_margin (likely an older Postgres version) — not required for the app to work.';
end $$;

-- ============================================================
-- 7. Crop Library permissions: owner+admin can edit, owner only can delete
--    (adding stays open to owner/admin/member, same as every other table)
-- ============================================================

drop policy if exists crops_update on crops;
create policy crops_update on crops for update using (current_user_role(org_id) in ('owner','admin'));

drop policy if exists crops_delete on crops;
create policy crops_delete on crops for delete using (current_user_role(org_id) = 'owner');

-- ============================================================
-- 8. seed_org_defaults(): include sow_rate_g so future orgs seed correctly too
-- ============================================================

create or replace function seed_org_defaults(target_org uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into crops (org_id, name, seed_type, sterilization, presoak, mat_setup, weight_dome,
    blackout_days, light_days, total_cycle_days_min, total_cycle_days_max, watering_schedule,
    kelp_schedule, tent_zone_temp, harvest_window, cut_height, washing, drying, packaging,
    storage_temp, seed_cost_per_g, sow_rate_g, is_premium, notes)
  values
  (target_org,'Broccoli (Waltham 29)','Standard','5-10 min H2O2','None','Single Mat','15lb Weight','3-4 Days','4-8 Days',8,12,
   'Bottom-water daily (after blackout)','None','Middle/Bottom (65-70F)','8-12 Days','1/2 inch above soil',
   'Yes (if seed hulls attached)','Spin dry gently','Clamshell','36-40F',0.0371,20,false,'Best-margin crop from real cost data.'),
  (target_org,'Radish (Daikon Minowase)','Standard','5-10 min H2O2','None','Single Mat','15lb Weight','3-4 Days','3-4 Days',6,8,
   'Bottom-water daily (after blackout)','None','Middle/Bottom (65-70F)','6-8 Days','1/2 inch above soil',
   'Yes','Spin dry gently','Clamshell','36-40F',0.0371,25,false,'Workhorse radish — half the seed cost of Rambo.'),
  (target_org,'Radish (Rambo Purple, organic)','Standard','5-10 min H2O2','None','Single Mat','15lb Weight','3-4 Days','3-4 Days',6,8,
   'Bottom-water daily (after blackout)','None','Middle/Bottom (65-70F)','6-8 Days','1/2 inch above soil',
   'Yes','Spin dry gently','Clamshell','36-40F',0.0887,25,true,'Specialty — price as premium, ~2x Daikon seed cost.'),
  (target_org,'Lentils','Large','5-10 min H2O2','8 hours','Single Mat','15lb Weight','3-4 Days','6-10 Days',10,14,
   'Bottom-water daily','None','Middle (70F)','10-14 Days','1/2 inch above soil','No','N/A','Clamshell/Bag','36-40F',
   0.0095,175,false,'Unusual crop — confirm buyer demand before scaling. Seed cost is an estimate.'),
  (target_org,'Sunflower (Black Oil)','Large','5-10 min H2O2','8-12 hours','Double Mat','15lb Weight','3-4 Days','7-10 Days',10,14,
   'Bottom-water 1-2x daily','Start Day 5','Middle (70F)','10-14 Days','1/2 inch above soil',
   'Yes (to remove hulls)','Spin dry gently','Clamshell','36-40F',0.0109,200,false,'High seed cost — sell it as nutty & crunchy.'),
  (target_org,'Peas (Speckled)','Large','5-10 min H2O2','8-12 hours','Double Mat','15lb Weight','3-4 Days','7-10 Days',10,14,
   'Bottom-water 1-2x daily','Start Day 5','Middle (70F)','10-14+ Days','1 inch above soil','No','N/A','Clamshell/Bag','36-40F',
   0.0090,225,false,'Sweet, high volume, juice-bar friendly.'),
  (target_org,'Bull''s Blood Beet','Cluster','5-10 min H2O2','8-12 hours','Single Mat (Damp)','Light Weight / Dome','4-5 Days','10-15 Days',15,20,
   'Bottom-water carefully (prevent rot)','Start Day 7','Middle/Bottom (65-70F)','15-20 Days','1/2 inch above soil',
   'Yes','Spin dry gently','Clamshell','36-40F',0.0300,25,true,'Deep red color — premium plating upsell. Seed cost is an estimate.'),
  (target_org,'Cilantro','Split Seed','5-10 min H2O2','8 hours','Thick/Double Mat','Humidity Dome ONLY','5-7 Days','10-14 Days',15,21,
   'Bottom-water daily (never dry)','Start Day 7','Absolute Bottom (60-65F)','15-21+ Days','1/2 inch above soil',
   'Yes (if hulls attached)','Spin dry gently','Clamshell','36-40F',0.0500,30,true,'Premium herb — never let it dry out.'),
  (target_org,'Arugula (Slow Bolt)','Standard','5-10 min H2O2','None','Single Mat','15lb Weight','3-4 Days','4-8 Days',8,12,
   'Bottom-water daily (after blackout)','None','Middle/Bottom (65-70F)','8-12 Days','1/2 inch above soil',
   'Yes','Spin dry gently','Clamshell','36-40F',0.0250,12,false,'Seed cost is an estimate.'),
  (target_org,'Kale (Red Russian)','Standard','5-10 min H2O2','None','Single Mat','15lb Weight','3-4 Days','4-8 Days',8,12,
   'Bottom-water daily (after blackout)','None','Middle/Bottom (65-70F)','8-12 Days','1/2 inch above soil',
   'Yes','Spin dry gently','Clamshell','36-40F',0.0250,15,false,'Seed cost is an estimate.'),
  (target_org,'Mustard (Japanese Red Giant)','Standard','5-10 min H2O2','None','Single Mat','15lb Weight','3-4 Days','4-8 Days',8,12,
   'Bottom-water daily (after blackout)','None','Middle/Bottom (65-70F)','8-12 Days','1/2 inch above soil',
   'Yes','Spin dry gently','Clamshell','36-40F',0.0200,10,false,'Seed cost is an estimate.'),
  (target_org,'Amaranth','Small','5-10 min H2O2','None','Single Mat','Humidity Dome ONLY','3-5 Days','10-14 Days',13,19,
   'Bottom-water daily','None','Middle (70F)','13-19 Days','1/2 inch above soil','Yes','Spin dry gently','Clamshell','36-40F',
   0.0400,8,true,'Magenta color = premium plating.'),
  (target_org,'Wheatgrass','Large','5-10 min H2O2','8-12 hours','Double Mat','15lb Weight','3-4 Days','6-8 Days',9,12,
   'Bottom-water 1-2x daily','None','Middle (70F)','9-12 Days','1 inch above soil','No','N/A','Clamshell/Bag','36-40F',
   0.0080,300,false,'Sell as live tray or juice-bar wholesale, not clamshell. Seed cost is an estimate.'),
  (target_org,'Basil','Standard','5-10 min H2O2','None','Single Mat','15lb Weight','4-7 Days','10-15 Days',20,25,
   'Bottom-water daily (after blackout)','None','Middle (70F)','15-20 Days','1/2 inch above soil','No','N/A','Clamshell','36-40F',
   0.0600,8,true,'NOT yet tested in your protocol — verified estimate. Grow a test tray and log real numbers.')
  on conflict do nothing;

  insert into sales_channels (org_id, name, channel_type, status, area, pitch_notes, priority)
  values
  (target_org,'Scratch Kitchen & Cocktails','restaurant','untried','Norman','Single radish + micro basil — cocktail garnish & plating grade, 10 min away',1),
  (target_org,'Local','restaurant','untried','Norman','House mix + singles — you''re already 70% local, I''m your microgreen delivered weekly',1),
  (target_org,'Nonesuch','restaurant','untried','OKC','Premium singles + micro herbs — tasting-menu-grade, rare varieties, cut to order',1),
  (target_org,'Ludivine','restaurant','untried','OKC','Seasonal singles + herbs — local & seasonal, unbroken cold chain to your dock',1),
  (target_org,'Kitchen No. 324','restaurant','untried','OKC','Pea, sunflower, broccoli volume — brunch bowls & toast, consistent standing order',2),
  (target_org,'Packard''s New American','restaurant','untried','OKC','Radish, broccoli, amaranth — reliable plating greens, Midtown-close',2),
  (target_org,'FRIDA Southwest','restaurant','untried','OKC','Cilantro + amaranth — Southwest color & flavor, local-sourcing brand fit',2),
  (target_org,'The Sushi Bar','restaurant','untried','OKC','Radish, micro cilantro — bright garnish, never wilts on the plate',2),
  (target_org,'Wheeze the Juice','restaurant','untried','OKC','Pea, sunflower, broccoli bulk — nutrient-dense blend base by the pound',3),
  (target_org,'Norman Farm Market','farmers_market','untried','Norman','2026 vendor application — apply as produce vendor',1),
  (target_org,'Moore Farm Market','farmers_market','untried','Moore','Second market once volume supports two stalls a week',3),
  (target_org,'OKC Food Hub','wholesale','untried','OKC','Wholesale aggregator — apply as supplier for restaurant/institutional volume',1),
  (target_org,'Circleculture Farm','csa','untried','OKC','CSA add-on pitch — microgreens as premium box add-on',2),
  (target_org,'CommonWealth Urban Farms','csa','untried','NW OKC','Weekly CSA — community-minded, open to local partners',2)
  on conflict do nothing;
end;
$$;

-- ============================================================
-- 9. Data API grants for the new table/view (see 0005 for why this is needed explicitly)
-- ============================================================

revoke all on inventory_movements from anon;
revoke all on crop_inventory from anon;

grant select, insert, delete on inventory_movements to authenticated;
grant select on crop_inventory to authenticated;
