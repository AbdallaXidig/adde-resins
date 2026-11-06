import { NextResponse, type NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { jwtVerify } from "jose";
import { routing } from "./i18n/routing";
import { SESSION_COOKIE } from "./lib/session-constants";

const intl = createMiddleware(routing);

// First line of defence for /admin. Every admin page and action also re-checks the user
// and their permissions against the database in lib/auth.ts.
export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === "/admin/login") return NextResponse.next();
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    const token = req.cookies.get(SESSION_COOKIE)?.value;
    try {
      if (!token) throw new Error("no session");
      await jwtVerify(token, new TextEncoder().encode(process.env.AUTH_SECRET ?? ""));
      return NextResponse.next();
    } catch {
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }
  }
  return intl(req);
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|assets|media|favicon.ico|icon.png|robots.txt|sitemap.xml|.*\\..*).*)"],
};
