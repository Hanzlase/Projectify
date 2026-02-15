import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { auth } from "@/lib/auth"

// Production flag
const isProd = process.env.NODE_ENV === 'production';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Skip healthcheck requests from Railway
  const host = request.headers.get('host') || ''
  if (host.includes('healthcheck.railway.app') || pathname === '/api/health') {
    return NextResponse.next()
  }

  // OPTIMIZATION: Skip auth check for auth API routes - let NextAuth handle them directly
  // This prevents double auth verification and speeds up login significantly
  if (pathname.startsWith('/api/auth')) {
    return NextResponse.next()
  }

  // Public routes that don't require authentication
  const publicRoutes = ["/login", "/", "/landing", "/suspended", "/coordinator-suspended", "/forgot-password", "/help"]
  const isPublicRoute = publicRoutes.some(route => pathname === route || pathname.startsWith(route + "/"))

  // Get session - wrap in try-catch to handle auth errors gracefully
  let session = null
  try {
    session = await auth()
  } catch (error) {
    if (!isProd) console.error("Auth error in middleware:", error)
    
    // If JWT decryption fails (e.g. secret changed), clear stale auth cookies
    // so the user can log in fresh instead of getting stuck in a redirect loop
    const errorMsg = error instanceof Error ? error.message : String(error)
    if (errorMsg.includes('decryption') || errorMsg.includes('JWE') || errorMsg.includes('JWTSessionError')) {
      const response = isPublicRoute 
        ? NextResponse.next() 
        : NextResponse.redirect(new URL("/login", request.url))
      
      // Delete all auth-related cookies to force a fresh login
      response.cookies.delete('authjs.session-token')
      response.cookies.delete('__Secure-authjs.session-token')
      response.cookies.delete('authjs.callback-url')
      response.cookies.delete('authjs.csrf-token')
      response.cookies.delete('next-auth.session-token')
      response.cookies.delete('__Secure-next-auth.session-token')
      response.cookies.delete('next-auth.callback-url')
      response.cookies.delete('next-auth.csrf-token')
      return response
    }
    
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

    // Admin routes
    if (pathname.startsWith("/admin") && userRole !== "admin") {
      return NextResponse.redirect(new URL("/unauthorized", request.url))
    }

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
