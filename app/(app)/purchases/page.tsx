import { getOrgContext, getPurchases, getCrops } from "@/lib/data";
import { PageHeader } from "@/components/ui";
import PurchasesClient from "./PurchasesClient";

export default async function PurchasesPage() {
  const ctx = await getOrgContext();
  const [purchases, crops] = await Promise.all([getPurchases(ctx.orgId), getCrops(ctx.orgId)]);
  return (
    <div>
      <PageHeader title="Purchases" subtitle="Every dollar spent — seeds, trays, equipment, supplies. Feeds your real cost-per-tray numbers." />
      <PurchasesClient orgId={ctx.orgId} purchases={purchases} crops={crops} />
    </div>
  );
}
