import { getOrgContext, getCeaAreas, getCeaCrops } from "@/lib/data";
import { PageHeader } from "@/components/ui";
import CeaClient from "./CeaClient";

export default async function CeaPage() {
  const ctx = await getOrgContext();
  const [areas, crops] = await Promise.all([
    getCeaAreas(ctx.orgId),
    getCeaCrops(ctx.orgId),
  ]);
  return (
    <div>
      <PageHeader
        title="Greenhouse / Indoor"
        subtitle="Controlled-environment growing — greenhouse, high tunnel, indoor vertical, or hydroponic areas, each with its own plantings and environment log."
      />
      <CeaClient orgId={ctx.orgId} role={ctx.role} areas={areas} crops={crops} weightUnit={ctx.weightUnit} areaUnit={ctx.areaUnit} />
    </div>
  );
}
