import { getOrgContext, getMembers, getPendingInvites } from "@/lib/data";
import { PageHeader } from "@/components/ui";
import SettingsClient from "./SettingsClient";

export default async function SettingsPage() {
  const ctx = await getOrgContext();
  const [members, invites] = await Promise.all([
    getMembers(ctx.orgId),
    getPendingInvites(ctx.orgId),
  ]);

  return (
    <div>
      <PageHeader title="Settings" subtitle="Your farm, your team, and your plan." />
      <SettingsClient ctx={ctx} members={members} invites={invites} />
    </div>
  );
}
