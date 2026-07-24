import { getOrgContext, getInventory, getFarmSupplies } from "@/lib/data";
import { PageHeader } from "@/components/ui";
import InventoryClient from "./InventoryClient";

export default async function InventoryPage() {
  const ctx = await getOrgContext();
  const [inventory, supplies] = await Promise.all([
    getInventory(ctx.orgId),
    getFarmSupplies(ctx.orgId, ["nutrient", "commercial_seed"]),
  ]);
  return (
    <div>
      <PageHeader
        title="Inventory"
        subtitle="Seed and harvested-crop stock on hand — updates automatically from Purchases, Batches, and Sales."
      />
      <InventoryClient orgId={ctx.orgId} inventory={inventory} role={ctx.role} supplies={supplies} />
    </div>
  );
}
