import { getOrgContext, getPurchases } from "@/lib/data";
import { PageHeader } from "@/components/ui";
import PurchasesClient from "./PurchasesClient";

export default async function PurchasesPage() {
  const ctx = await getOrgContext();
  const purchases = await getPurchases(ctx.orgId);
  return (
    <div>
      <PageHeader title="Purchases" subtitle="Every dollar spent — seeds, trays, equipment, supplies. Feeds your real cost-per-tray numbers." />
      <PurchasesClient orgId={ctx.orgId} purchases={purchases} />
    </div>
  );
}
