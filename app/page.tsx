import { redirect } from "next/navigation";

// There's no dedicated page for the bare root URL — middleware already sends logged-out visitors
// to /login, so any request that reaches this point is either logged in (send to /dashboard) or
// in demo mode (also /dashboard). Without this file, visiting the bare domain 404s even though
// every other route works fine, since Next.js doesn't have anything to render for "/" itself.
export default function RootPage() {
  redirect("/dashboard");
}
