import type { NextAuthConfig } from "next-auth";

import { sanitizeAuthUrlEnvironment } from "@/lib/auth-environment";

sanitizeAuthUrlEnvironment();

function getSafeAdminDestination(requestUrl: URL) {
  const callbackUrl = requestUrl.searchParams.get("callbackUrl");

  if (callbackUrl?.startsWith("/admin/") && !callbackUrl.startsWith("//")) {
    return callbackUrl;
  }

  return "/admin/dashboard";
}

export const authConfig = {
  // Next.js supplies the canonical request host. Auth.js requires this flag
  // when running outside a platform that sets AUTH_TRUST_HOST automatically.
  trustHost: true,
  pages: {
    signIn: "/admin/login",
  },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const { pathname, search } = request.nextUrl;
      const isAdminRoute = pathname.startsWith("/admin/") || pathname === "/admin";
      const isLoginRoute = pathname === "/admin/login";

      if (!isAdminRoute) {
        return true;
      }

      if (isLoginRoute) {
        if (auth?.user) {
          return Response.redirect(
            new URL(getSafeAdminDestination(request.nextUrl), request.nextUrl),
          );
        }

        return true;
      }

      if (auth?.user) {
        return true;
      }

      const loginUrl = new URL("/admin/login", request.nextUrl);
      loginUrl.searchParams.set("callbackUrl", `${pathname}${search}`);
      return Response.redirect(loginUrl);
    },
  },
} satisfies NextAuthConfig;
