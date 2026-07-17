"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { DEMO_MODE } from "@/lib/demo-mode";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/batches", label: "Batches" },
  { href: "/purchases", label: "Purchases" },
  { href: "/sales", label: "Sales" },
  { href: "/channels", label: "Sales Channels" },
  { href: "/crops", label: "Crop Library" },
  { href: "/environmental", label: "Environment Log" },
  { href: "/goals", label: "Goals" },
  { href: "/settings", label: "Settings" },
];

export default function Nav({ orgName, role }: { orgName: string; role: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden flex items-center justify-between border-b border-stone-200 bg-white px-4 py-3 sticky top-0 z-30">
        <div className="font-bold text-brand-700">Harvest OS</div>
        <button className="btn-secondary !px-3 !py-1.5" onClick={() => setOpen(!open)}>
          {open ? "Close" : "Menu"}
        </button>
      </div>

      {/* Sidebar (desktop) / drawer (mobile) */}
      <div
        className={`${open ? "block" : "hidden"} md:block fixed md:sticky top-0 md:top-auto inset-0 md:inset-auto z-40 md:z-auto`}
      >
        <div className="hidden md:block absolute inset-0 bg-black/30" onClick={() => setOpen(false)} />
        <aside className="relative md:sticky md:top-0 h-screen w-72 md:w-64 bg-white border-r border-stone-200 flex flex-col">
          <div className="p-5 border-b border-stone-100">
            <div className="font-extrabold text-brand-700 text-lg tracking-tight">Harvest OS</div>
            <div className="text-xs text-stone-500 mt-0.5 truncate">{orgName || "Your farm"}</div>
            {DEMO_MODE && (
              <span className="badge bg-gold-400/20 text-gold-600 mt-2">Demo data</span>
            )}
          </div>
          <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
            {NAV.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    active ? "bg-brand-700 text-white" : "text-stone-600 hover:bg-stone-100"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="p-4 border-t border-stone-100">
            <div className="text-xs text-stone-400 mb-2 capitalize">Role: {role || "member"}</div>
            <button className="btn-secondary w-full !py-1.5 text-sm" onClick={handleLogout}>
              Log out
            </button>
          </div>
        </aside>
      </div>
    </>
  );
}
