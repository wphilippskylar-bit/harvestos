-- Phil: first step toward an FSA-578-style acreage report export. There's no live USDA API for an
-- individual producer to submit acreage reports electronically — filing happens in person at an
-- FSA office, through a crop insurance agent, or as a shapefile/GeoJSON import into a producer's
-- own farmers.gov account — so the realistic, buildable version of "FSA-578 support" is an export
-- formatted to match what the form and the FSA office actually ask for, not a government
-- integration. Fields already covers most of what FSA-578 needs (crop, crop type, acres via
-- migration 0018's boundary map, planting date). Two fields are missing: producer share (their %
-- interest in this planting — relevant on shared/leased ground) and intended use (grain, feed,
-- cover crop, etc. — FSA-578 asks for this explicitly and it isn't reliably inferable from
-- anything already stored).

alter table plantings add column if not exists producer_share_pct numeric
  check (producer_share_pct is null or (producer_share_pct >= 0 and producer_share_pct <= 100));

alter table plantings add column if not exists intended_use text
  check (intended_use is null or intended_use in
    ('grain','feed','seed','cover_crop','forage','fresh_market','processing','other'));
