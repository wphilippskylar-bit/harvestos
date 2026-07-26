import { getOrgContext } from "@/lib/data";
import { PageHeader } from "@/components/ui";
import ImportExportClient from "./ImportExportClient";

// Import and Export used to be two separate nav tabs pointing at nearly-mirror-image UIs (both
// driven by the same lib/import-configs.ts). Combined into one page with a tab switcher — reached
// from a Dashboard link rather than its own nav item, since it's a periodic/setup task, not
// something people click into every day the way Batches or Sales are.
export default async function ImportExportPage() {
  const ctx = await getOrgContext();
  return (
    <div>
      <PageHeader
        title="Import & export data"
        subtitle="Bring in an existing spreadsheet, or download your farm's records — including the FSA-578-style acreage report."
      />
      <ImportExportClient orgId={ctx.orgId} orgName={ctx.orgName} />
    </div>
  );
}
