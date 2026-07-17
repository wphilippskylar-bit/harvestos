import { redirect } from "next/navigation";
import Nav from "@/components/Nav";
import { getOrgContext } from "@/lib/data";
import { DEMO_MODE } from "@/lib/demo-mode";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getOrgContext();

  if (!DEMO_MODE && !ctx.userId) {
    redirect("/login");
  }
  if (!DEMO_MODE && ctx.userId && !ctx.orgId) {
    // Signed in but no org/membership yet — shouldn't normally happen since signup creates one,
    // but covers invited users whose membership hasn't landed yet.
    redirect("/login");
  }

  return (
    <div className="md:flex min-h-screen">
      <Nav orgName={ctx.orgName} role={ctx.role} />
      <main className="flex-1 min-w-0">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-10">{children}</div>
      </main>
    </div>
  );
}
