import { getOrgContext, getPurchases, getCrops, getFields, getFarmSupplies, getAnimals, getEquipmentDepreciation } from "@/lib/data";
import { PageHeader } from "@/components/ui";
import PurchasesClient from "./PurchasesClient";

export default async function PurchasesPage() {
  const ctx = await getOrgContext();
  const [purchases, crops, fields, supplies, equipmentSupplies, animals, equipment] = await Promise.all([
    getPurchases(ctx.orgId),
    getCrops(ctx.orgId),
    getFields(ctx.orgId),
    getFarmSupplies(ctx.orgId, ["nutrient", "feed", "commercial_seed"]),
    getFarmSupplies(ctx.orgId, ["equipment"]),
    getAnimals(ctx.orgId),
    getEquipmentDepreciation(ctx.orgId),
  ]);
  return (
    <div>
      <PageHeader title="Purchases" subtitle="Every dollar spent — seeds, trays, equipment, supplies. Feeds your real cost-per-tray numbers." />
      <PurchasesClient
        orgId={ctx.orgId}
        purchases={purchases}
        crops={crops}
        fields={fields}
        supplies={[...supplies, ...equipmentSupplies]}
        equipmentSupplies={equipmentSupplies}
        animals={animals}
        equipment={equipment}
        isEditor={ctx.role === "owner" || ctx.role === "admin" || ctx.role === "member"}
      />
    </div>
  );
}
