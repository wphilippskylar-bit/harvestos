import { getOrgContext, getInventory } from "@/lib/data";
import { PageHeader } from "@/components/ui";
import InventoryClient from "./InventoryClient";

export default async function InventoryPage() {
  const ctx = await getOrgContext();
  const inventory = await getInventory(ctx.orgId);
  return (
    <div>
      <PageHeader
        title="Inventory"
        subtitle="Seed and harvested-crop stock on hand — updates automatically from Purchases, Batches, and Sales."
      />
      <InventoryClient orgId={ctx.orgId} inventory={inventory} role={ctx.role} />
    </div>
  );
}
