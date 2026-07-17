import { getOrgContext, getSalesChannels } from "@/lib/data";
import { PageHeader } from "@/components/ui";
import ChannelsClient from "./ChannelsClient";

export default async function ChannelsPage() {
  const ctx = await getOrgContext();
  const channels = await getSalesChannels(ctx.orgId);
  return (
    <div>
      <PageHeader title="Sales Channels" subtitle="Every restaurant, market, and account — untried, attempted, in progress, or active. Move a card as things develop." />
      <ChannelsClient orgId={ctx.orgId} channels={channels} />
    </div>
  );
}
