import { SESSION_COOKIE_NAME } from "@/lib/auth/session-cookie.constants";
import createIntlMiddleware from "next-intl/middleware";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { routing } from "./i18n/routing";

const locales = routing.locales as readonly string[];

const handleI18nRouting = createIntlMiddleware(routing);

function pathnameWithoutLocale(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  const first = segments[0];
  if (first && locales.includes(first)) {
    const rest = segments.slice(1).join("/");
    return rest ? `/${rest}` : "/";
  }
  return pathname;
}

function localeFromPathname(pathname: string): string {
  const first = pathname.split("/").filter(Boolean)[0];
  if (first && locales.includes(first)) return first;
  return routing.defaultLocale;
}

export default function middleware(request: NextRequest) {
  const response = handleI18nRouting(request);

  if (response.status >= 300 && response.status < 400) {
    return response;
  }

  const stripped = pathnameWithoutLocale(request.nextUrl.pathname);
  const locale = localeFromPathname(request.nextUrl.pathname);

  const session = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const hasSession = Boolean(session);

  const isProtected =
    stripped === "/dashboard" ||
    stripped.startsWith("/dashboard/") ||
    stripped.startsWith("/inventory");

  const isAuthPage = stripped === "/login" || stripped === "/register";

  if (isProtected && !hasSession) {
    return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
  }

  if (isAuthPage && hasSession) {
    return NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
