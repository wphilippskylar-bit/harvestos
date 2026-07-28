import Link from "next/link";
import { getOrgContext, getBatchById, getEnvironmentalLogsForBatch } from "@/lib/data";
import QuickLogClient from "./QuickLogClient";

// Landing page for a scanned batch QR code (see components/BatchQrCode.tsx) — deliberately
// separate from the main Batches page so it can be a fast, single-purpose mobile screen: land
// here, log a reading, done, rather than hunting through the full nav and table on a phone.
export default async function BatchQuickLogPage({ params }: { params: { id: string } }) {
  const ctx = await getOrgContext();
  const batch = await getBatchById(ctx.orgId, params.id);

  if (!batch) {
    return (
      <div className="max-w-md mx-auto text-center py-10 space-y-3">
        <h1 className="text-lg font-semibold text-stone-800">Batch not found</h1>
        <p className="text-sm text-stone-500">
          This batch may have been deleted, or belongs to a different farm than the one you're signed into.
        </p>
        <Link href="/batches" className="text-sm text-brand-700 hover:underline">Go to Batches</Link>
      </div>
    );
  }

  const logs = await getEnvironmentalLogsForBatch(ctx.orgId, batch.id);

  return <QuickLogClient orgId={ctx.orgId} batch={batch} logs={logs} />;
}
