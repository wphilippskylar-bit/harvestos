import { getOrgContext } from "@/lib/data";
import { PageHeader } from "@/components/ui";
import ImportClient from "./ImportClient";

export default async function ImportPage() {
  const ctx = await getOrgContext();
  return (
    <div>
      <PageHeader
        title="Import data"
        subtitle="Bring in an existing spreadsheet — upload a CSV, match your columns to Harvest OS's fields, and import."
      />
      <ImportClient orgId={ctx.orgId} />
    </div>
  );
}
