import { auth } from "@/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login"];
const CHANGE_PASSWORD_PATH = "/schimba-parola";

export default auth(function proxy(req: NextRequest & { auth?: unknown }) {
  const { pathname } = req.nextUrl;
  const session = (req as { auth?: { user?: unknown; roles?: string[]; mustChangeOnLogin?: boolean } }).auth;
  const roles: string[] = (session as { roles?: string[] })?.roles ?? [];
  const mustChange: boolean = (session as { mustChangeOnLogin?: boolean })?.mustChangeOnLogin ?? false;

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    if (session?.user) {
      const dest = roles.includes("PARENT") ? "/panou-parinte" : "/panou-principal";
      return NextResponse.redirect(new URL(dest, req.url));
    }
    return NextResponse.next();
  }

  if (!session?.user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Force password change before accessing anything else
  if (mustChange && pathname !== CHANGE_PASSWORD_PATH) {
    return NextResponse.redirect(new URL(CHANGE_PASSWORD_PATH, req.url));
  }

  // PARENT users can only access /panou-parinte and /api routes
  if (roles.includes("PARENT") && !pathname.startsWith("/panou-parinte")) {
    return NextResponse.redirect(new URL("/panou-parinte", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
