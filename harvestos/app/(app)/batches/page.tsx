import { getOrgContext, getBatches, getCrops } from "@/lib/data";
import { PageHeader } from "@/components/ui";
import BatchesClient from "./BatchesClient";

export default async function BatchesPage() {
  const ctx = await getOrgContext();
  const [batches, crops] = await Promise.all([getBatches(ctx.orgId), getCrops(ctx.orgId)]);
  return (
    <div>
      <PageHeader title="Batches" subtitle="Every planting, tracked from sow to sale. Batch IDs auto-generate or you can set your own." />
      <BatchesClient orgId={ctx.orgId} batches={batches} crops={crops} />
    </div>
  );
}
