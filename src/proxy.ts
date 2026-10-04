import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, verifyAdminToken } from "@/server/admin/session-token";

/**
 * - /admin/** : redirige vers la connexion sans session valide (vérifiée à nouveau
 *   dans chaque page et action serveur).
 * - Autres chemins sans préfixe de langue : redirection vers /fr (défaut) ou la langue mémorisée.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    if (pathname === "/admin/login") return NextResponse.next();
    if (!verifyAdminToken(request.cookies.get(ADMIN_COOKIE)?.value)) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
    return NextResponse.next();
  }

  const first = pathname.split("/")[1];
  if (first === "fr" || first === "en") return NextResponse.next();

  const saved = request.cookies.get("locale")?.value;
  const locale = saved === "en" ? "en" : "fr";
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|media|icon.svg|favicon.ico|robots.txt|sitemap.xml|.*\\.[a-zA-Z0-9]+$).*)"],
};
