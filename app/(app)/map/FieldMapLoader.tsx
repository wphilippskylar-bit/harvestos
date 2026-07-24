"use client";

import dynamic from "next/dynamic";

// Leaflet touches `window`/`document` on load, so it can't run during server rendering — load it
// client-side only, same pattern any Leaflet-in-Next.js integration needs.
const FieldMap = dynamic(() => import("@/components/FieldMap"), {
  ssr: false,
  loading: () => (
    <div className="card flex items-center justify-center text-sm text-stone-400" style={{ height: 500 }}>
      Loading map…
    </div>
  ),
});

export default function FieldMapLoader(props: { orgId: string; fields: any[]; isEditor: boolean }) {
  return <FieldMap {...props} />;
}
