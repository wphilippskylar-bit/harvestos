import { getOrgContext, getCrops, getInventory } from "@/lib/data";
import { PageHeader } from "@/components/ui";
import CropsClient from "./CropsClient";

export default async function CropsPage() {
  const ctx = await getOrgContext();
  const [crops, inventory] = await Promise.all([getCrops(ctx.orgId), getInventory(ctx.orgId)]);

  return (
    <div>
      <PageHeader title="Crop Library" subtitle="Your grow protocol, by crop — soak, blackout, watering, harvest & packaging. Seeded from your real records." />
      <CropsClient orgId={ctx.orgId} crops={crops} inventory={inventory} role={ctx.role} />
    </div>
  );
}
