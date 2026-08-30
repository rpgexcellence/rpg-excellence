import { NextResponse } from "next/server";

export function middleware(request) {
  const match = request.nextUrl.pathname.match(/^\/audit-actions\/([^/]+)$/);
  if (!match) return NextResponse.next();
  const response = NextResponse.next();
  response.cookies.set("audit_action_token", decodeURIComponent(match[1]), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
  return response;
}

export const config = { matcher: ["/audit-actions/:path*"] };
