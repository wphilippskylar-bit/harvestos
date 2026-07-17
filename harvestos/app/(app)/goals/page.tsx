import { getOrgContext, getGoals } from "@/lib/data";
import { PageHeader } from "@/components/ui";
import GoalsClient from "./GoalsClient";

export default async function GoalsPage() {
  const ctx = await getOrgContext();
  const goals = await getGoals(ctx.orgId);
  return (
    <div>
      <PageHeader title="Goals" subtitle="You set the targets — trays/week, accounts landed, take-home per month — the app tracks progress against them." />
      <GoalsClient orgId={ctx.orgId} goals={goals} />
    </div>
  );
}
