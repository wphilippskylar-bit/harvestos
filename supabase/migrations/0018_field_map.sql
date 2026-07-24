-- Phil: simple field/pasture map (#3 on the market-feature roadmap) — a free, code-only answer to
-- Climate FieldView's and AgriWebb's map-first view, using Leaflet + OpenStreetMap tiles (no
-- license fee, no hardware sync). Two optional, additive fields on `fields`:
--   - map_lat/map_lng: a single pin location (simplest case — "here's where this field/pasture is")
--   - boundary: an optional drawn polygon (array of [lat, lng] pairs) for growers who want the
--     actual outline, not just a pin. Stored as jsonb since Postgres/PostGIS geometry types aren't
--     set up in this project and a plain coordinate array is all the Leaflet frontend needs.
-- Nothing here is required — existing fields with neither set just don't show up on the map yet.

alter table fields add column if not exists map_lat numeric;
alter table fields add column if not exists map_lng numeric;
alter table fields add column if not exists boundary jsonb;
