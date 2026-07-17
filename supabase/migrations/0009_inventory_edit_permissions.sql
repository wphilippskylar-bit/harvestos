-- Phil: "inventory needs an edit option available to owner and admin roles."
--
-- Two things on the Inventory page count as "editing": the manual Adjust action (a direct
-- correction to seed/harvest stock) and the low-stock threshold field. The threshold field
-- already writes to crops.low_stock_threshold_trays, which the 0008 migration already
-- restricted to owner+admin via the crops_update policy — that part was already correct at
-- the database level, just not reflected in the UI (a member could see an editable-looking
-- field that would silently no-op on save). This migration tightens the other half: manual
-- inventory adjustments, which were open to any editor (owner/admin/member) same as regular
-- data entry. Tightening this to owner+admin only.
--
-- This does NOT affect the automatic inventory movements from purchases/batches/sales — those
-- are written by security-definer trigger functions (sync_purchase_inventory,
-- sync_batch_inventory, sync_sale_inventory), which run under the function owner's privileges
-- and bypass this policy entirely. A member starting a batch or logging a sale still updates
-- inventory automatically, exactly as before — only the standalone "Adjust" button changes.

drop policy if exists inv_move_insert on inventory_movements;
create policy inv_move_insert on inventory_movements
  for insert with check (current_user_role(org_id) in ('owner','admin'));
