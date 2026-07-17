import { redirect } from "next/navigation";
import Nav from "@/components/Nav";
import SignOutButton from "@/components/SignOutButton";
import { getOrgContext } from "@/lib/data";
import { DEMO_MODE } from "@/lib/demo-mode";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getOrgContext();

  if (!DEMO_MODE && !ctx.userId) {
    redirect("/login");
  }
  if (!DEMO_MODE && ctx.userId && !ctx.orgId) {
    // Signed in but no org/membership — happens if a user was created directly in the
    // Supabase dashboard (bypassing this app's "Create account" form, which sets up the
    // farm + owner membership together), or if an invite hasn't landed yet. Show a message
    // here instead of redirecting to /login: middleware sends any logged-in user away from
    // /login straight back to /dashboard, so redirecting there would just create an
    // infinite bounce between the two.
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 px-4">
        <div className="card p-8 max-w-md text-center space-y-4">
          <h1 className="text-lg font-semibold text-stone-800">No farm found for this account</h1>
          <p className="text-sm text-stone-500">
            You're signed in, but this account isn't attached to a farm yet. This usually happens
            when a user is created directly in the Supabase dashboard instead of through this
            app's "Create account" form. Sign out and use "Create account" instead, or — if
            someone invited you — ask them to check Settings → Team to confirm the invite.
          </p>
          <SignOutButton />
        </div>
      </div>
    );
  }

  return (
    <div className="md:flex min-h-screen">
      <Nav orgName={ctx.orgName} role={ctx.role} operationTypes={ctx.operationTypes} />
      <main className="flex-1 min-w-0">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-10">{children}</div>
      </main>
    </div>
  );
}
