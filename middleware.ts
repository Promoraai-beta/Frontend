import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname === "/login") {
    const url = request.nextUrl.clone()
    url.pathname = "/auth"
    return NextResponse.redirect(url)
  }

  if (pathname === "/register") {
    const url = request.nextUrl.clone()
    url.pathname = "/auth"
    if (!url.searchParams.has("tab")) {
      url.searchParams.set("tab", "signup")
    }
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/login", "/register"],
}
