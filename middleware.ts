import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl

    // 1. Check for auth session cookie
    const sessionCookie = request.cookies.get("user_session")?.value
    const session = sessionCookie ? JSON.parse(sessionCookie) : null

    // 2. Define Route Guards
    const isDashboard = pathname.startsWith("/dashboard")
    const isStudentRoute = pathname.startsWith("/dashboard/student")
    const isAdminRoute = pathname.startsWith("/dashboard/admin") || pathname.startsWith("/dashboard/super-admin")

    // Auth Routes (Public)
    const isAuthRoute = pathname === "/login" || pathname === "/register" || pathname.startsWith("/forgot-password") || pathname.startsWith("/reset-password")

    // 3. Logic

    // A. Unauthenticated Access to Protected Routes
    if (isDashboard && !session) {
        const loginUrl = new URL("/login", request.url)
        loginUrl.searchParams.set("callbackUrl", pathname)
        return NextResponse.redirect(loginUrl)
    }

    // B. Authenticated Access to Public Routes (Prevent Re-login)
    // Optional: Redirect to dashboard if already logged in and trying to visit login
    if (isAuthRoute && session) {
        if (session.role === "student") {
            return NextResponse.redirect(new URL("/dashboard/student", request.url))
        } else if (["admin", "super_admin", "teacher"].includes(session.role)) {
            // Default admin landing
            return NextResponse.redirect(new URL("/dashboard/admin", request.url))
        }
    }

    // C. Role-Based Access Control
    if (session) {
        if (isStudentRoute && session.role !== "student") {
            // Admin trying to access student view? Or just deny.
            // For now, redirect to their own dashboard
            return NextResponse.redirect(new URL("/dashboard/admin", request.url))
        }

        if (isAdminRoute && session.role === "student") {
            // Student trying to access admin view
            return NextResponse.redirect(new URL("/dashboard/student", request.url))
        }
    }

    return NextResponse.next()
}

export const config = {
    // Match dashboard routes AND auth routes to redirect active sessions
    matcher: ["/dashboard/:path*", "/login", "/register", "/forgot-password/:path*", "/reset-password/:path*"]
}
