import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { auth } from "@/lib/auth"

export async function middleware(request: NextRequest) {
  const session = await auth()
  const { pathname } = request.nextUrl

  // Public routes that don't require authentication
  const publicRoutes = ["/login", "/", "/api/auth"]
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))

  // If not authenticated and trying to access protected route
  if (!session && !isPublicRoute) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Role-based access control
  if (session) {
    const userRole = session.user.role

    // Coordinator routes
    if (pathname.startsWith("/coordinator") && userRole !== "coordinator") {
      return NextResponse.redirect(new URL("/unauthorized", request.url))
    }

    // Student routes
    if (pathname.startsWith("/student") && userRole !== "student") {
      return NextResponse.redirect(new URL("/unauthorized", request.url))
    }

    // Supervisor routes
    if (pathname.startsWith("/supervisor") && userRole !== "supervisor") {
      return NextResponse.redirect(new URL("/unauthorized", request.url))
    }

    // Redirect to appropriate dashboard if accessing login while authenticated
    if (pathname === "/login") {
      return NextResponse.redirect(new URL(`/${userRole}/dashboard`, request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
