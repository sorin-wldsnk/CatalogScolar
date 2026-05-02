import { auth } from "@/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login"];

export default auth(function proxy(req: NextRequest & { auth?: unknown }) {
  const { pathname } = req.nextUrl;
  const session = (req as { auth?: { user?: unknown; roles?: string[] } }).auth;
  const roles: string[] = (session as { roles?: string[] })?.roles ?? [];

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    if (session?.user) {
      const dest = roles.includes("PARENT") ? "/panou-parinte" : "/dashboard";
      return NextResponse.redirect(new URL(dest, req.url));
    }
    return NextResponse.next();
  }

  if (!session?.user) {
    return NextResponse.redirect(new URL("/login", req.url));
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
