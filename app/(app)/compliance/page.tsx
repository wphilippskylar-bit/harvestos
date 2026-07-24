import { getOrgContext, getComplianceReportData } from "@/lib/data";
import { PageHeader } from "@/components/ui";
import ComplianceClient from "./ComplianceClient";

export default async function CompliancePage({
  searchParams,
}: {
  searchParams?: { start?: string; end?: string };
}) {
  const ctx = await getOrgContext();
  const today = new Date().toISOString().slice(0, 10);
  const yearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const startDate = searchParams?.start || yearAgo;
  const endDate = searchParams?.end || today;

  const { animals, healthLogs, grazingEvents } = await getComplianceReportData(ctx.orgId, startDate, endDate);

  return (
    <div>
      <PageHeader
        title="Compliance & audit trail"
        subtitle="A dated, exportable record of herd status, treatments, withdrawal periods, and pasture movement — for buyers, inspectors, or grant reporting."
      />
      <ComplianceClient
        orgName={ctx.orgName}
        animals={animals}
        healthLogs={healthLogs}
        grazingEvents={grazingEvents}
        startDate={startDate}
        endDate={endDate}
      />
    </div>
  );
}
