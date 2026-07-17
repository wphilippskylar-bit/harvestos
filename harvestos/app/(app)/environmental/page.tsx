import { getOrgContext, getEnvironmentalLogs } from "@/lib/data";
import { PageHeader } from "@/components/ui";
import EnvClient from "./EnvClient";

export default async function EnvironmentalPage() {
  const ctx = await getOrgContext();
  const logs = await getEnvironmentalLogs(ctx.orgId);
  return (
    <div>
      <PageHeader title="Environment Log" subtitle="Temperature, humidity, VPD, and light — catch problems before they cost you a batch." />
      <EnvClient orgId={ctx.orgId} logs={logs} />
    </div>
  );
}
