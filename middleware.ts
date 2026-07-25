import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { DEMO_MODE } from "@/lib/demo-mode";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  // In demo mode there's no real Supabase project yet — skip auth gating entirely
  // so the app is fully clickable with mock data.
  if (DEMO_MODE) return response;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthRoute = request.nextUrl.pathname.startsWith("/login") ||
    request.nextUrl.pathname.startsWith("/signup") ||
    request.nextUrl.pathname.startsWith("/auth");

  // Terms/Privacy need to be readable by someone who isn't signed in yet (e.g. clicking the link
  // from the signup form before creating an account), and shouldn't redirect a logged-in user away
  // either — unlike /login, there's no reason to bounce someone off these pages just because
  // they're authenticated.
  const isPublicLegalRoute = request.nextUrl.pathname.startsWith("/terms") ||
    request.nextUrl.pathname.startsWith("/privacy");
  if (isPublicLegalRoute) return response;

  if (!user && !isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // /auth/reset-password is the one auth route a LOGGED-IN user is supposed to land on: clicking
  // a password-reset email link establishes a real (recovery-scoped) session before the person has
  // had a chance to actually set their new password. Bouncing them straight to /dashboard here
  // would strand them mid-reset with no way back to the form. Only /login and /signup should still
  // redirect an already-logged-in visitor away.
  const isRecoveryRoute = request.nextUrl.pathname.startsWith("/auth/reset-password");
  if (user && isAuthRoute && !isRecoveryRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
