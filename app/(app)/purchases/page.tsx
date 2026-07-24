import { getOrgContext, getPurchases, getCrops, getFields, getFarmSupplies } from "@/lib/data";
import { PageHeader } from "@/components/ui";
import PurchasesClient from "./PurchasesClient";

export default async function PurchasesPage() {
  const ctx = await getOrgContext();
  const [purchases, crops, fields, supplies] = await Promise.all([
    getPurchases(ctx.orgId),
    getCrops(ctx.orgId),
    getFields(ctx.orgId),
    getFarmSupplies(ctx.orgId),
  ]);
  return (
    <div>
      <PageHeader title="Purchases" subtitle="Every dollar spent — seeds, trays, equipment, supplies. Feeds your real cost-per-tray numbers." />
      <PurchasesClient orgId={ctx.orgId} purchases={purchases} crops={crops} fields={fields} supplies={supplies} />
    </div>
  );
}
