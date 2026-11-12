import { NextResponse } from "next/server";
import { authConfig } from "./auth.config";
import NextAuth from "next-auth";

import { LOGIN, isPublicRoute } from "@/lib/routes";
import type { NextRequest } from "next/server";

const { auth } = NextAuth(authConfig);

export async function middleware(request: NextRequest) {
  const { nextUrl } = request;
  const session = await auth();
  const isAuthenticated = !!session?.user;
  

  if (!isAuthenticated && !isPublicRoute(nextUrl.pathname))
    return NextResponse.redirect(new URL(LOGIN, nextUrl));
}

export const config = {
  // Strictly exclude NextAuth.js API routes, _next, and static files
  matcher: [
    '/((?!api/auth|_next|.*\\..*).*)'
  ]
};
