import { getOrgContext, getAnimals, getGrazingOverview, getHerdSummary, getFarmSupplies } from "@/lib/data";
import { PageHeader } from "@/components/ui";
import LivestockClient from "./LivestockClient";

export default async function LivestockPage() {
  const ctx = await getOrgContext();
  const [animals, grazing, herdSummary, feedSupplies] = await Promise.all([
    getAnimals(ctx.orgId),
    getGrazingOverview(ctx.orgId),
    getHerdSummary(ctx.orgId),
    getFarmSupplies(ctx.orgId, ["feed"]),
  ]);
  return (
    <div>
      <PageHeader
        title="Livestock"
        subtitle="Animal records, health log, withdrawal-period tracking, and pasture rotation so you know at a glance who's safe to sell or milk and where the herd's been."
      />
      <LivestockClient
        orgId={ctx.orgId}
        role={ctx.role}
        animals={animals}
        fields={grazing.fields}
        grazingEvents={grazing.events}
        herdSummary={herdSummary}
        feedSupplies={feedSupplies}
      />
    </div>
  );
}
