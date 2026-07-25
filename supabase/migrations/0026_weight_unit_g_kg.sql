-- Phil: "add a dropdown for weight in all sections, and let weights convert seamlessly." The org
-- weight-unit preference (0022) only allowed lb/oz — widen it to also allow grams and kilograms,
-- matching the g/kg conversion helpers added to lib/units.ts. This is additive (existing lb/oz
-- orgs are unaffected) so no backfill needed.

alter table organizations drop constraint if exists organizations_weight_unit_check;
alter table organizations add constraint organizations_weight_unit_check
  check (weight_unit in ('lb','oz','g','kg'));
