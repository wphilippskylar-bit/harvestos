import { getOrgContext, getSops } from "@/lib/data";
import { PageHeader } from "@/components/ui";
import SopsClient from "./SopsClient";

export default async function SopsPage() {
  const ctx = await getOrgContext();
  const sops = await getSops(ctx.orgId);
  return (
    <div>
      <PageHeader title="SOPs" subtitle="Standard operating procedures — the how-to steps for running things the same way every time." />
      <SopsClient orgId={ctx.orgId} role={ctx.role} sops={sops as any} />
    </div>
  );
}
