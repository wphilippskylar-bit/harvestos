import { getOrgContext, getSales, getSalesChannels } from "@/lib/data";
import { PageHeader } from "@/components/ui";
import SalesClient from "./SalesClient";

export default async function SalesPage() {
  const ctx = await getOrgContext();
  const [sales, channels] = await Promise.all([getSales(ctx.orgId), getSalesChannels(ctx.orgId)]);
  return (
    <div>
      <PageHeader title="Sales" subtitle="Every sale, logged — the tab that turns a plan into a real business." />
      <SalesClient orgId={ctx.orgId} sales={sales} channels={channels} />
    </div>
  );
}
