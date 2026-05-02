import { auth } from "@/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login"];

export default auth(function proxy(req: NextRequest & { auth?: unknown }) {
  const { pathname } = req.nextUrl;
  const session = (req as { auth?: { user?: unknown } }).auth;

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    if (session?.user) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  }

  if (!session?.user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
