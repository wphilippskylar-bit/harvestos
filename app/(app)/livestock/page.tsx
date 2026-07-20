import { getOrgContext, getAnimals } from "@/lib/data";
import { PageHeader } from "@/components/ui";
import LivestockClient from "./LivestockClient";

export default async function LivestockPage() {
  const ctx = await getOrgContext();
  const animals = await getAnimals(ctx.orgId);
  return (
    <div>
      <PageHeader
        title="Livestock"
        subtitle="Animal records, health log, and withdrawal-period tracking so you know at a glance who's safe to sell or milk."
      />
      <LivestockClient orgId={ctx.orgId} role={ctx.role} animals={animals} />
    </div>
  );
}
