import { getOrgContext } from "@/lib/data";
import { PageHeader } from "@/components/ui";
import ExportClient from "./ExportClient";

export default async function ExportPage() {
  const ctx = await getOrgContext();
  return (
    <div>
      <PageHeader title="Export data" subtitle="Download your farm's records as a CSV — for backups, or moving data elsewhere." />
      <ExportClient orgId={ctx.orgId} orgName={ctx.orgName} />
    </div>
  );
}
