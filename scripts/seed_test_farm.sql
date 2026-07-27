-- Seeds realistic test data into your existing "Test Farm" org so every settings/module screen
-- has something real to click through before beta testers arrive — not demo-mode fake data, real
-- rows in your actual Supabase project, scoped only to this one org.
--
-- HOW TO RUN: Supabase dashboard → SQL Editor → paste this whole file → Run. The SQL Editor
-- connects as the postgres role, which bypasses Row Level Security entirely, so this works
-- regardless of which org role your logged-in user has.
--
-- SAFE TO RE-RUN: every insert is guarded (checks for existing rows first), so running this twice
-- won't duplicate data — it'll just skip anything already there.

do $$
declare
  v_org_id uuid;
  v_crop_microgreen uuid;
  v_crop_field uuid;
  v_crop_cea uuid;
  v_field_id uuid;
  v_field_row_id uuid;
  v_cea_area_id uuid;
  v_cea_row_id uuid;
  v_animal1_id uuid;
  v_animal2_id uuid;
  v_channel_id uuid;
  v_batch_id uuid;
begin
  -- Locate the org. Adjust the name filter below if your Test Farm's actual name differs.
  select id into v_org_id from organizations where name ilike 'Test Farm%' limit 1;
  if v_org_id is null then
    raise exception 'No org matching ''Test Farm%%'' found — check organizations.name and adjust the filter in this script.';
  end if;

  -- Turn on every operation type so every nav tab (Microgreens, Greenhouse, Fields, Livestock,
  -- Compliance, Map) is visible for testing, and set unit preferences to something non-default
  -- so the g/kg/sq-ft conversion work is actually exercised, not just the defaults.
  update organizations set
    operation_types = array['microgreens','field_crop','livestock','cea'],
    weight_unit = 'oz',
    area_unit = 'acres',
    schedule_notify_mode = 'digest'
  where id = v_org_id;

  -- ---------- Crop Library ----------
  select id into v_crop_microgreen from crops where org_id = v_org_id and name = 'Sunflower (test)';
  if v_crop_microgreen is null then
    insert into crops (org_id, name, applicable_to, seed_cost_per_g, sow_rate_g, oz_per_tray, oz_per_clamshell, crop_family, is_premium)
    values (v_org_id, 'Sunflower (test)', array['microgreens'], 0.012, 60, 8, 2, 'Asteraceae', false)
    returning id into v_crop_microgreen;
  end if;

  select id into v_crop_field from crops where org_id = v_org_id and name = 'Sweet Corn (test)';
  if v_crop_field is null then
    insert into crops (org_id, name, applicable_to, crop_family)
    values (v_org_id, 'Sweet Corn (test)', array['field_crop'], 'Poaceae')
    returning id into v_crop_field;
  end if;

  select id into v_crop_cea from crops where org_id = v_org_id and name = 'Heirloom Tomato (test)';
  if v_crop_cea is null then
    insert into crops (org_id, name, applicable_to, crop_family)
    values (v_org_id, 'Heirloom Tomato (test)', array['cea'], 'Solanaceae')
    returning id into v_crop_cea;
  end if;

  -- ---------- Batches (microgreens) ----------
  select id into v_batch_id from batches where org_id = v_org_id and batch_id = 'TEST-0001';
  if v_batch_id is null then
    insert into batches (org_id, batch_id, crop_id, crop_name_snapshot, plant_date, tray_amount, status, dry_seed_weight_g)
    values (v_org_id, 'TEST-0001', v_crop_microgreen, 'Sunflower (test)', current_date - 10, 4, 'growing', 240)
    returning id into v_batch_id;
  end if;
  if not exists (select 1 from batches where org_id = v_org_id and batch_id = 'TEST-0002') then
    insert into batches (org_id, batch_id, crop_id, crop_name_snapshot, plant_date, harvest_date, tray_amount, status, dry_seed_weight_g, fresh_harvest_weight_g)
    values (v_org_id, 'TEST-0002', v_crop_microgreen, 'Sunflower (test)', current_date - 20, current_date - 8, 3, 'harvested', 180, 2500);
  end if;

  -- ---------- Fields + rows + plantings ----------
  select id into v_field_id from fields where org_id = v_org_id and name = 'North 40 (test)';
  if v_field_id is null then
    insert into fields (org_id, name, is_high_tunnel, size_acres)
    values (v_org_id, 'North 40 (test)', false, 38.5)
    returning id into v_field_id;
  end if;
  select id into v_field_row_id from field_rows where org_id = v_org_id and field_id = v_field_id and label = 'Row 1 (test)';
  if v_field_row_id is null then
    insert into field_rows (org_id, field_id, label) values (v_org_id, v_field_id, 'Row 1 (test)') returning id into v_field_row_id;
  end if;
  if not exists (select 1 from plantings where org_id = v_org_id and field_id = v_field_id and crop_name_snapshot = 'Sweet Corn (test)') then
    insert into plantings (org_id, field_id, row_id, crop_id, crop_name_snapshot, crop_family_snapshot, planted_date, status, producer_share_pct, intended_use)
    values (v_org_id, v_field_id, v_field_row_id, v_crop_field, 'Sweet Corn (test)', 'Poaceae', current_date - 30, 'growing', 100, 'grain');
  end if;

  -- ---------- CEA areas + rows + plantings ----------
  select id into v_cea_area_id from cea_areas where org_id = v_org_id and name = 'Greenhouse 1 (test)';
  if v_cea_area_id is null then
    insert into cea_areas (org_id, name, area_type, sq_ft, last_sterilized_date, sterilization_notes)
    values (v_org_id, 'Greenhouse 1 (test)', 'hydroponic', 480, current_date - 14, 'Bleach rinse between cycles (test)')
    returning id into v_cea_area_id;
  end if;
  select id into v_cea_row_id from cea_area_rows where org_id = v_org_id and area_id = v_cea_area_id and label = 'Rack A (test)';
  if v_cea_row_id is null then
    insert into cea_area_rows (org_id, area_id, label) values (v_org_id, v_cea_area_id, 'Rack A (test)') returning id into v_cea_row_id;
  end if;
  if not exists (select 1 from cea_plantings where org_id = v_org_id and area_id = v_cea_area_id and crop_name_snapshot = 'Heirloom Tomato (test)') then
    insert into cea_plantings (org_id, area_id, row_id, crop_id, crop_name_snapshot, planted_date, status, yield_amount, yield_unit, growing_medium)
    values (v_org_id, v_cea_area_id, v_cea_row_id, v_crop_cea, 'Heirloom Tomato (test)', current_date - 25, 'growing', 5, 'lb', 'hydroponic_mat');
  end if;

  -- ---------- Animals + health logs + grazing ----------
  select id into v_animal1_id from animals where org_id = v_org_id and ear_tag_number = 'T-001';
  if v_animal1_id is null then
    insert into animals (org_id, ear_tag_number, breed, birth_date, status)
    values (v_org_id, 'T-001', 'Angus (test)', current_date - 400, 'active')
    returning id into v_animal1_id;
  end if;
  select id into v_animal2_id from animals where org_id = v_org_id and ear_tag_number = 'T-002';
  if v_animal2_id is null then
    insert into animals (org_id, ear_tag_number, breed, birth_date, status)
    values (v_org_id, 'T-002', 'Angus (test)', current_date - 200, 'active')
    returning id into v_animal2_id;
  end if;
  if not exists (select 1 from animal_health_logs where org_id = v_org_id and animal_id = v_animal1_id) then
    insert into animal_health_logs (org_id, animal_id, log_date, treatment_type, treatment_name, withdrawal_days, notes)
    values (v_org_id, v_animal1_id, current_date - 5, 'medication', 'Test antibiotic', 14, 'Seeded test record');
  end if;
  if not exists (select 1 from grazing_events where org_id = v_org_id and field_id = v_field_id) then
    insert into grazing_events (org_id, field_id, row_id, start_date, end_date, animal_notes, notes)
    values (v_org_id, v_field_id, v_field_row_id, current_date - 15, current_date - 5, 'T-001, T-002 (test)', 'Seeded test grazing event');
  end if;

  -- ---------- Sales channels + sales ----------
  select id into v_channel_id from sales_channels where org_id = v_org_id and name = 'Norman Farm Market (test)';
  if v_channel_id is null then
    insert into sales_channels (org_id, name, channel_type, status)
    values (v_org_id, 'Norman Farm Market (test)', 'farmers_market', 'active')
    returning id into v_channel_id;
  end if;
  if not exists (select 1 from sales where org_id = v_org_id and batch_id = v_batch_id) then
    insert into sales (org_id, batch_id, crop_id, channel_id, sale_date, unit, quantity, unit_price)
    values (v_org_id, v_batch_id, v_crop_microgreen, v_channel_id, current_date - 3, 'clamshell', 12, 4.5);
  end if;

  -- ---------- Purchases ----------
  if not exists (select 1 from purchases where org_id = v_org_id and item = 'Sunflower seed (test)') then
    insert into purchases (org_id, item, purchase_date, category, vendor, cost, tax, shipping)
    values (v_org_id, 'Sunflower seed (test)', current_date - 18, 'Seeds', 'True Leaf Market (test)', 45.00, 3.60, 8.00);
  end if;

  -- ---------- Labor ----------
  if not exists (select 1 from labor_entries where org_id = v_org_id and batch_id = v_batch_id) then
    insert into labor_entries (org_id, batch_id, work_date, worker_name, hours, hourly_rate, notes)
    values (v_org_id, v_batch_id, current_date - 2, 'Test Worker', 1.5, 15.00, 'Harvest (test) — seeded test labor entry');
  end if;

  -- ---------- Goals ----------
  if not exists (select 1 from goals where org_id = v_org_id and title = 'Weekly revenue target (test)') then
    insert into goals (org_id, title, metric_type, target_value, status)
    values (v_org_id, 'Weekly revenue target (test)', 'revenue', 500, 'active');
  end if;

  -- ---------- Schedule + SOPs ----------
  if not exists (select 1 from schedule_events where org_id = v_org_id and title = 'Sow next sunflower batch (test)') then
    insert into schedule_events (org_id, title, notes, event_date, event_type, status, batch_id, notify, remind_days_before)
    values (v_org_id, 'Sow next sunflower batch (test)', 'Seeded test schedule event', current_date + 3, 'planting', 'pending', v_batch_id, true, 1);
  end if;
  if not exists (select 1 from sops where org_id = v_org_id and title = 'Sterilization protocol (test)') then
    insert into sops (org_id, title, category, content)
    values (v_org_id, 'Sterilization protocol (test)', 'Sanitation', 'Seeded test SOP content — replace with your real protocol.');
  end if;

  -- ---------- Market watchlist ----------
  if not exists (select 1 from market_watchlist where org_id = v_org_id and report_slug = 'TEST-REPORT-SLUG') then
    insert into market_watchlist (org_id, report_slug, report_title)
    values (v_org_id, 'TEST-REPORT-SLUG', 'National Feeder & Stocker Cattle Summary (test pin)');
  end if;

  raise notice 'Seed complete for org %', v_org_id;
end $$;
