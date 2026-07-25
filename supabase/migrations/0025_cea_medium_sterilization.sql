-- Phil: two small opportunistic CEA fields flagged during the Google AI report review — growers
-- using hydroponic setups want to track what growing medium a planting is in (mat, rockwool, NFT
-- channel, coco coir, soil, etc.), and CEA growers doing recirculating/hydro systems care about
-- sanitation between cycles the way microgreens growers don't have an equivalent for. Both are
-- lightweight additive columns — no new tables needed.

-- Growing medium lives on the PLANTING, not the area: the same physical area (say, a hydroponic
-- rack) can run different media across different growing cycles, so it belongs with "what's
-- planted right now," alongside crop/status/dates.
alter table cea_plantings add column if not exists growing_medium text
  check (growing_medium is null or growing_medium in
    ('hydroponic_mat','rockwool','nft_channel','coco_coir','soil','perlite_vermiculite','other'));

-- Sterilization/sanitation is tracked at the AREA level — it's the physical space/equipment that
-- gets cleaned between cycles, independent of any one planting.
alter table cea_areas add column if not exists last_sterilized_date date;
alter table cea_areas add column if not exists sterilization_notes text;
