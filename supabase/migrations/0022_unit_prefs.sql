-- Phil: unit preferences. A lot of growers want pounds for most things, but microgreens growers
-- live in ounces, and folks want to think in acres or square feet depending on how big their
-- operation is. Add an org-level preference for both, plus an actual size field on Fields (which
-- never had a size column at all) so the area-unit preference has something real to apply to.

alter table organizations add column if not exists weight_unit text not null default 'lb'
  check (weight_unit in ('lb','oz'));
alter table organizations add column if not exists area_unit text not null default 'acres'
  check (area_unit in ('acres','sq_ft'));

-- Backfill: an org that's ONLY doing microgreens almost certainly wants ounces, not pounds.
update organizations set weight_unit = 'oz'
  where operation_types = array['microgreens']::text[];

-- Fields never had a size column — add one now, stored in acres (the canonical unit; display
-- conversion to/from sq ft happens in the app via lib/units.ts) so field-size tracking and the
-- area-unit preference are actually useful together.
alter table fields add column if not exists size_acres numeric;
