import { getOrgContext, getFields } from "@/lib/data";
import { PageHeader, EmptyState } from "@/components/ui";
import FieldMapLoader from "./FieldMapLoader";

export default async function MapPage() {
  const ctx = await getOrgContext();
  const fields = await getFields(ctx.orgId);
  const isEditor = ctx.role === "owner" || ctx.role === "admin" || ctx.role === "member";

  return (
    <div>
      <PageHeader
        title="Map"
        subtitle="A free visual layout of your fields, high tunnels, and pastures — drop a pin or draw a boundary, no hardware or paid map service required."
      />
      {fields.length === 0 ? (
        <EmptyState title="No fields yet" hint="Add a field on the Fields page first, then come back here to place it on the map." />
      ) : (
        <FieldMapLoader orgId={ctx.orgId} fields={fields} isEditor={isEditor} />
      )}
    </div>
  );
}
