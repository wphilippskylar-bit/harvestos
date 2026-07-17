import { getOrgContext, getFields, getFieldCropCrops } from "@/lib/data";
import { PageHeader } from "@/components/ui";
import FieldsClient from "./FieldsClient";

export default async function FieldsPage() {
  const ctx = await getOrgContext();
  const fields = await getFields(ctx.orgId);
  const crops = await getFieldCropCrops(ctx.orgId);
  return (
    <div>
      <PageHeader
        title="Fields"
        subtitle="Field, row/bed, soil test, and rotation tracking for high tunnel, commercial, and urban crops."
      />
      <FieldsClient orgId={ctx.orgId} role={ctx.role} fields={fields} crops={crops} />
    </div>
  );
}
