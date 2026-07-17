-- Two fixes:
--
-- 1. seed_org_defaults() never set seed_cost_per_g (or sow_rate_g) on any seeded crop, so
--    every crop landed with seed_cost_per_g = NULL. The dashboard's "Cost per tray by crop"
--    chart filters on `crops.filter(c => c.seed_cost_per_g)`, so with nothing set, it always
--    showed empty even though the crops themselves existed (visible fine on the Crop Library
--    page, which doesn't filter on this). This UPDATEs Phil's already-seeded crops directly,
--    and also fixes the function definition so any future org (multi-tenant licensing) seeds
--    correctly from day one.
--
--    Values marked "estimate" below aren't from a purchase receipt yet — they're reasonable
--    per-crop-type numbers to unblock the chart. Real ones can be entered any time from the
--    Crop Library page's new "Add crop" form (edit support can follow if useful), or by
--    re-running an UPDATE like this once real seed purchase data exists for that crop.

update crops set seed_cost_per_g = 0.0371 where name = 'Broccoli (Waltham 29)' and seed_cost_per_g is null;
update crops set seed_cost_per_g = 0.0371 where name = 'Radish (Daikon Minowase)' and seed_cost_per_g is null;
update crops set seed_cost_per_g = 0.0887 where name = 'Radish (Rambo Purple, organic)' and seed_cost_per_g is null;
update crops set seed_cost_per_g = 0.0095 where name = 'Lentils' and seed_cost_per_g is null; -- estimate
update crops set seed_cost_per_g = 0.0109 where name = 'Sunflower (Black Oil)' and seed_cost_per_g is null;
update crops set seed_cost_per_g = 0.0090 where name = 'Peas (Speckled)' and seed_cost_per_g is null;
update crops set seed_cost_per_g = 0.0300 where name = 'Bull''s Blood Beet' and seed_cost_per_g is null; -- estimate
update crops set seed_cost_per_g = 0.0500 where name = 'Cilantro' and seed_cost_per_g is null;
update crops set seed_cost_per_g = 0.0250 where name = 'Arugula (Slow Bolt)' and seed_cost_per_g is null; -- estimate
update crops set seed_cost_per_g = 0.0250 where name = 'Kale (Red Russian)' and seed_cost_per_g is null; -- estimate
update crops set seed_cost_per_g = 0.0200 where name = 'Mustard (Japanese Red Giant)' and seed_cost_per_g is null; -- estimate
update crops set seed_cost_per_g = 0.0400 where name = 'Amaranth' and seed_cost_per_g is null;
update crops set seed_cost_per_g = 0.0080 where name = 'Wheatgrass' and seed_cost_per_g is null; -- estimate
update crops set seed_cost_per_g = 0.0600 where name = 'Basil' and seed_cost_per_g is null;

create or replace function seed_org_defaults(target_org uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into crops (org_id, name, seed_type, sterilization, presoak, mat_setup, weight_dome,
    blackout_days, light_days, total_cycle_days_min, total_cycle_days_max, watering_schedule,
    kelp_schedule, tent_zone_temp, harvest_window, cut_height, washing, drying, packaging,
    storage_temp, seed_cost_per_g, is_premium, notes)
  values
  (target_org,'Broccoli (Waltham 29)','Standard','5-10 min H2O2','None','Single Mat','15lb Weight','3-4 Days','4-8 Days',8,12,
   'Bottom-water daily (after blackout)','None','Middle/Bottom (65-70F)','8-12 Days','1/2 inch above soil',
   'Yes (if seed hulls attached)','Spin dry gently','Clamshell','36-40F',0.0371,false,'Best-margin crop from real cost data.'),
  (target_org,'Radish (Daikon Minowase)','Standard','5-10 min H2O2','None','Single Mat','15lb Weight','3-4 Days','3-4 Days',6,8,
   'Bottom-water daily (after blackout)','None','Middle/Bottom (65-70F)','6-8 Days','1/2 inch above soil',
   'Yes','Spin dry gently','Clamshell','36-40F',0.0371,false,'Workhorse radish — half the seed cost of Rambo.'),
  (target_org,'Radish (Rambo Purple, organic)','Standard','5-10 min H2O2','None','Single Mat','15lb Weight','3-4 Days','3-4 Days',6,8,
   'Bottom-water daily (after blackout)','None','Middle/Bottom (65-70F)','6-8 Days','1/2 inch above soil',
   'Yes','Spin dry gently','Clamshell','36-40F',0.0887,true,'Specialty — price as premium, ~2x Daikon seed cost.'),
  (target_org,'Lentils','Large','5-10 min H2O2','8 hours','Single Mat','15lb Weight','3-4 Days','6-10 Days',10,14,
   'Bottom-water daily','None','Middle (70F)','10-14 Days','1/2 inch above soil','No','N/A','Clamshell/Bag','36-40F',
   0.0095,false,'Unusual crop — confirm buyer demand before scaling. Seed cost is an estimate.'),
  (target_org,'Sunflower (Black Oil)','Large','5-10 min H2O2','8-12 hours','Double Mat','15lb Weight','3-4 Days','7-10 Days',10,14,
   'Bottom-water 1-2x daily','Start Day 5','Middle (70F)','10-14 Days','1/2 inch above soil',
   'Yes (to remove hulls)','Spin dry gently','Clamshell','36-40F',0.0109,false,'High seed cost — sell it as nutty & crunchy.'),
  (target_org,'Peas (Speckled)','Large','5-10 min H2O2','8-12 hours','Double Mat','15lb Weight','3-4 Days','7-10 Days',10,14,
   'Bottom-water 1-2x daily','Start Day 5','Middle (70F)','10-14+ Days','1 inch above soil','No','N/A','Clamshell/Bag','36-40F',
   0.0090,false,'Sweet, high volume, juice-bar friendly.'),
  (target_org,'Bull''s Blood Beet','Cluster','5-10 min H2O2','8-12 hours','Single Mat (Damp)','Light Weight / Dome','4-5 Days','10-15 Days',15,20,
   'Bottom-water carefully (prevent rot)','Start Day 7','Middle/Bottom (65-70F)','15-20 Days','1/2 inch above soil',
   'Yes','Spin dry gently','Clamshell','36-40F',0.0300,true,'Deep red color — premium plating upsell. Seed cost is an estimate.'),
  (target_org,'Cilantro','Split Seed','5-10 min H2O2','8 hours','Thick/Double Mat','Humidity Dome ONLY','5-7 Days','10-14 Days',15,21,
   'Bottom-water daily (never dry)','Start Day 7','Absolute Bottom (60-65F)','15-21+ Days','1/2 inch above soil',
   'Yes (if hulls attached)','Spin dry gently','Clamshell','36-40F',0.0500,true,'Premium herb — never let it dry out.'),
  (target_org,'Arugula (Slow Bolt)','Standard','5-10 min H2O2','None','Single Mat','15lb Weight','3-4 Days','4-8 Days',8,12,
   'Bottom-water daily (after blackout)','None','Middle/Bottom (65-70F)','8-12 Days','1/2 inch above soil',
   'Yes','Spin dry gently','Clamshell','36-40F',0.0250,false,'Seed cost is an estimate.'),
  (target_org,'Kale (Red Russian)','Standard','5-10 min H2O2','None','Single Mat','15lb Weight','3-4 Days','4-8 Days',8,12,
   'Bottom-water daily (after blackout)','None','Middle/Bottom (65-70F)','8-12 Days','1/2 inch above soil',
   'Yes','Spin dry gently','Clamshell','36-40F',0.0250,false,'Seed cost is an estimate.'),
  (target_org,'Mustard (Japanese Red Giant)','Standard','5-10 min H2O2','None','Single Mat','15lb Weight','3-4 Days','4-8 Days',8,12,
   'Bottom-water daily (after blackout)','None','Middle/Bottom (65-70F)','8-12 Days','1/2 inch above soil',
   'Yes','Spin dry gently','Clamshell','36-40F',0.0200,false,'Seed cost is an estimate.'),
  (target_org,'Amaranth','Small','5-10 min H2O2','None','Single Mat','Humidity Dome ONLY','3-5 Days','10-14 Days',13,19,
   'Bottom-water daily','None','Middle (70F)','13-19 Days','1/2 inch above soil','Yes','Spin dry gently','Clamshell','36-40F',
   0.0400,true,'Magenta color = premium plating.'),
  (target_org,'Wheatgrass','Large','5-10 min H2O2','8-12 hours','Double Mat','15lb Weight','3-4 Days','6-8 Days',9,12,
   'Bottom-water 1-2x daily','None','Middle (70F)','9-12 Days','1 inch above soil','No','N/A','Clamshell/Bag','36-40F',
   0.0080,false,'Sell as live tray or juice-bar wholesale, not clamshell. Seed cost is an estimate.'),
  (target_org,'Basil','Standard','5-10 min H2O2','None','Single Mat','15lb Weight','4-7 Days','10-15 Days',20,25,
   'Bottom-water daily (after blackout)','None','Middle (70F)','15-20 Days','1/2 inch above soil','No','N/A','Clamshell','36-40F',
   0.0600,true,'NOT yet tested in your protocol — verified estimate. Grow a test tray and log real numbers.')
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
