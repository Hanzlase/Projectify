import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { auth } from "@/lib/auth"

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Skip healthcheck requests from Railway
  const host = request.headers.get('host') || ''
  if (host.includes('healthcheck.railway.app') || pathname === '/api/health') {
    return NextResponse.next()
  }

  // Public routes that don't require authentication
  const publicRoutes = ["/login", "/", "/landing", "/api/auth", "/suspended", "/forgot-password", "/help"]
  const isPublicRoute = publicRoutes.some(route => pathname === route || pathname.startsWith(route + "/"))

  // Get session - wrap in try-catch to handle auth errors gracefully
  let session = null
  try {
    session = await auth()
  } catch (error) {
    console.error("Auth error in middleware:", error)
    // If auth fails on public route, continue; otherwise redirect to login
    if (isPublicRoute) {
      return NextResponse.next()
    }
    const loginUrl = new URL("/login", request.url)
    return NextResponse.redirect(loginUrl)
  }

  // If not authenticated and trying to access protected route
  if (!session && !isPublicRoute) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Role-based access control - only if session exists and has user with role
  if (session?.user?.role) {
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

    // Redirect to appropriate dashboard if accessing login or landing page while authenticated
    if (pathname === "/login" || pathname === "/" || pathname === "/landing") {
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
     * - api/health (healthcheck endpoint)
     */
    "/((?!_next/static|_next/image|favicon.ico|api/health|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
