import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl

    // 1. Check for auth session cookie
    const sessionCookie = request.cookies.get("user_session")?.value
    const session = sessionCookie ? JSON.parse(sessionCookie) : null

    // 2. Define Route Guards
    const isDashboard = pathname.startsWith("/dashboard")
    const isStudentRoute = pathname.startsWith("/dashboard/student")
    const isTeacherRoute = pathname.startsWith("/dashboard/teacher")
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
    if (isAuthRoute && session) {
        if (session.role === "student") return NextResponse.redirect(new URL("/dashboard/student", request.url))
        if (session.role === "teacher") return NextResponse.redirect(new URL("/dashboard/teacher", request.url))
        if (["admin", "super_admin"].includes(session.role)) return NextResponse.redirect(new URL("/dashboard/admin", request.url))
    }

    // C. Role-Based Access Control (RBAC)
    if (session) {
        // Enforce Student Access
        if (isStudentRoute && session.role !== "student") {
            const dest = session.role === "teacher" ? "/dashboard/teacher" : "/dashboard/admin"
            return NextResponse.redirect(new URL(dest, request.url))
        }

        // Enforce Teacher Access
        if (isTeacherRoute && session.role !== "teacher") {
            const dest = session.role === "student" ? "/dashboard/student" : "/dashboard/admin"
            return NextResponse.redirect(new URL(dest, request.url))
        }

        // Enforce Admin Access
        if (isAdminRoute && !["admin", "super_admin"].includes(session.role)) {
            const dest = session.role === "student" ? "/dashboard/student" : "/dashboard/teacher"
            return NextResponse.redirect(new URL(dest, request.url))
        }
    }

    return NextResponse.next()
}

export const config = {
    // Match dashboard routes AND auth routes to redirect active sessions
    matcher: ["/dashboard/:path*", "/login", "/register", "/forgot-password/:path*", "/reset-password/:path*"]
}
