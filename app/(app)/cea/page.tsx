import { getOrgContext, getCeaAreas, getCeaCrops, getCeaFacilities } from "@/lib/data";
import { PageHeader } from "@/components/ui";
import CeaClient from "./CeaClient";

export default async function CeaPage() {
  const ctx = await getOrgContext();
  const [areas, crops, facilities] = await Promise.all([
    getCeaAreas(ctx.orgId),
    getCeaCrops(ctx.orgId),
    getCeaFacilities(ctx.orgId),
  ]);
  return (
    <div>
      <PageHeader
        title="Greenhouse / Indoor"
        subtitle="Controlled-environment growing — greenhouse, high tunnel, indoor vertical, or hydroponic areas, each with its own plantings and environment log. Group rooms under a facility to see the whole building at a glance."
      />
      <CeaClient
        orgId={ctx.orgId}
        role={ctx.role}
        areas={areas}
        crops={crops}
        facilities={facilities}
        weightUnit={ctx.weightUnit}
        areaUnit={ctx.areaUnit}
      />
    </div>
  );
}
