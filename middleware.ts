import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const AUTH_COOKIE_NAME = "auth_token";
const JWT_SECRET_STRING =
  process.env.JWT_SECRET ||
  "taskhub-assignment-2-secret-jwt-key-2026-very-secure";
const JWT_SECRET = new TextEncoder().encode(JWT_SECRET_STRING);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protected paths
  const isProtected =
    pathname.startsWith("/teams") || pathname.startsWith("/dashboard");

  if (!isProtected) {
    return NextResponse.next();
  }

  const tokenCookie = request.cookies.get(AUTH_COOKIE_NAME);
  if (!tokenCookie || !tokenCookie.value) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    await jwtVerify(tokenCookie.value, JWT_SECRET);
    return NextResponse.next();
  } catch {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete(AUTH_COOKIE_NAME);
    return response;
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api routes (they handle auth checks independently)
     * - _next/static, _next/image
     * - favicon.ico, public assets
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
