// Realistic demo data so the app is fully explorable before a real Supabase project
// is connected. Shaped identically to the real DB rows so swapping to live data is seamless.

export const demoOrg = {
  id: "demo-org",
  name: "Aiyahuta Craft Farm",
  plan_tier: "free",
  batch_id_prefix: "ACF",
};

export const demoCrops = [
  { id: "c1", name: "Broccoli (Waltham 29)", total_cycle_days_min: 8, total_cycle_days_max: 12, is_premium: false, seed_cost_per_g: 0.0371, packaging: "Clamshell" },
  { id: "c2", name: "Radish (Daikon Minowase)", total_cycle_days_min: 6, total_cycle_days_max: 8, is_premium: false, seed_cost_per_g: 0.0371, packaging: "Clamshell" },
  { id: "c3", name: "Radish (Rambo Purple, organic)", total_cycle_days_min: 6, total_cycle_days_max: 8, is_premium: true, seed_cost_per_g: 0.0887, packaging: "Clamshell" },
  { id: "c4", name: "Sunflower (Black Oil)", total_cycle_days_min: 10, total_cycle_days_max: 14, is_premium: false, seed_cost_per_g: 0.0109, packaging: "Clamshell" },
  { id: "c5", name: "Peas (Speckled)", total_cycle_days_min: 10, total_cycle_days_max: 14, is_premium: false, seed_cost_per_g: 0.0090, packaging: "Clamshell/Bag" },
  { id: "c6", name: "Cilantro", total_cycle_days_min: 15, total_cycle_days_max: 21, is_premium: true, seed_cost_per_g: 0.05, packaging: "Clamshell" },
  { id: "c7", name: "Basil", total_cycle_days_min: 20, total_cycle_days_max: 25, is_premium: true, seed_cost_per_g: 0.06, packaging: "Clamshell" },
  { id: "c8", name: "Amaranth", total_cycle_days_min: 13, total_cycle_days_max: 19, is_premium: true, seed_cost_per_g: 0.04, packaging: "Clamshell" },
];

export const demoBatches = [
  { id: "b1", batch_id: "ACF-20260716-001", crop_name_snapshot: "Kale (Red Russian)", plant_date: "2026-07-16", harvest_date: "2026-07-26", tray_amount: 2, status: "harvested", total_unit_cost: 3.25, fresh_harvest_weight_g: 620, dry_seed_weight_g: 36, rack_location: "Rack 2, tier 1" },
  { id: "b2", batch_id: "ACF-20260717-001", crop_name_snapshot: "Arugula (Slow Bolt)", plant_date: "2026-07-17", harvest_date: "2026-07-27", tray_amount: 3, status: "harvested", total_unit_cost: 2.85, fresh_harvest_weight_g: 810, dry_seed_weight_g: 45, rack_location: "Rack 1+2, tier 1" },
  { id: "b3", batch_id: "ACF-20260718-001", crop_name_snapshot: "Mustard (Japanese Red Giant)", plant_date: "2026-07-18", harvest_date: "2026-07-28", tray_amount: 3, status: "harvested", total_unit_cost: 2.88, fresh_harvest_weight_g: 705, dry_seed_weight_g: 45, rack_location: "Rack 2, tier 1" },
  { id: "b4", batch_id: "ACF-20260719-001", crop_name_snapshot: "Peas (Speckled)", plant_date: "2026-07-19", harvest_date: null, tray_amount: 6, status: "growing", total_unit_cost: 2.96, fresh_harvest_weight_g: null, dry_seed_weight_g: 972, rack_location: "Rack 1+2, tier 2+3" },
  { id: "b5", batch_id: "ACF-20260720-001", crop_name_snapshot: "Sunflower (Black Oil)", plant_date: "2026-07-20", harvest_date: null, tray_amount: 6, status: "growing", total_unit_cost: 3.14, fresh_harvest_weight_g: null, dry_seed_weight_g: 900, rack_location: "Rack 1+2, tier 3+2" },
  { id: "b6", batch_id: "ACF-20260721-001", crop_name_snapshot: "Radish (Daikon Minowase)", plant_date: "2026-07-21", harvest_date: null, tray_amount: 4, status: "planted", total_unit_cost: 2.70, fresh_harvest_weight_g: null, dry_seed_weight_g: 128, rack_location: "Rack 1, tier 4" },
];

export const demoPurchases = [
  { id: "p1", purchase_date: "2026-04-23", item: "Sunflower Black Oil", category: "Seeds", cost: 22.69, tax: 1.99, shipping: 0, total: 24.68, vendor: "TrueLeafMarket" },
  { id: "p2", purchase_date: "2026-04-23", item: "Radish Seeds - Daikon Minowase (Organic)", category: "Seeds", cost: 15.48, tax: 1.36, shipping: 0, total: 16.84, vendor: "TrueLeafMarket" },
  { id: "p3", purchase_date: "2026-04-23", item: "Broccoli Waltham 29", category: "Seeds", cost: 15.48, tax: 1.36, shipping: 0, total: 16.84, vendor: "TrueLeafMarket" },
  { id: "p4", purchase_date: "2026-04-23", item: "Harris Seeds Terrafibre Hemp Grow Mat Roll", category: "Medium", cost: 99.97, tax: 8.75, shipping: 0, total: 108.72, vendor: "Walmart" },
  { id: "p5", purchase_date: "2026-06-04", item: "Shinco 10,000 BTU Portable AC/Dehumidifier", category: "Equipment", cost: 259.99, tax: 22.75, shipping: 0, total: 282.74, vendor: "Amazon" },
  { id: "p6", purchase_date: "2026-05-04", item: "Hyper Tough 5-Tier Wire Shelf", category: "Equipment", cost: 129.00, tax: 11.29, shipping: 0, total: 140.29, vendor: "Walmart" },
];

export const demoChannels = [
  { id: "s1", name: "Scratch Kitchen & Cocktails", channel_type: "restaurant", status: "untried", area: "Norman", priority: 1 },
  { id: "s2", name: "Local", channel_type: "restaurant", status: "attempted", area: "Norman", priority: 1 },
  { id: "s3", name: "Nonesuch", channel_type: "restaurant", status: "untried", area: "OKC", priority: 1 },
  { id: "s4", name: "Ludivine", channel_type: "restaurant", status: "untried", area: "OKC", priority: 1 },
  { id: "s5", name: "Norman Farm Market", channel_type: "farmers_market", status: "in_progress", area: "Norman", priority: 1 },
  { id: "s6", name: "OKC Food Hub", channel_type: "wholesale", status: "untried", area: "OKC", priority: 1 },
  { id: "s7", name: "Kitchen No. 324", channel_type: "restaurant", status: "untried", area: "OKC", priority: 2 },
  { id: "s8", name: "Circleculture Farm (CSA)", channel_type: "csa", status: "untried", area: "OKC", priority: 2 },
];

export const demoSales = [
  { id: "sl1", sale_date: "2026-07-10", quantity: 4, unit: "clamshell", unit_price: 5, total_revenue: 20, customer_name: "Neighbor sample sale" },
];

export const demoGoals = [
  { id: "g1", title: "Land first 5 recurring restaurant accounts", metric_type: "accounts_active", target_value: 5, current_value: 0, target_date: "2026-09-30", status: "active" },
  { id: "g2", title: "Reach 85 trays sold / week", metric_type: "trays_sold_week", target_value: 85, current_value: 0, target_date: "2027-04-01", status: "active" },
  { id: "g3", title: "$5,000/month take-home (after tax)", metric_type: "take_home_month", target_value: 5000, current_value: 0, target_date: "2027-04-01", status: "active" },
];
