import { type NextRequest, NextResponse } from "next/server"
import { getUserByEmail } from "@/lib/db-helpers"

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    // In production, verify password hash
    const user = await getUserByEmail(email)

    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    // Verify password (simple string comparison for now as requested)
    // In production, use bcrypt.compare(password, user.password)
    if (user.password && user.password !== password) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    const response = NextResponse.json({ user })

    // Set Cookies for Server Side Access
    response.cookies.set("organizationId", user.organizationId, {
      httpOnly: true,
      path: "/",
      sameSite: "strict",
      maxAge: 60 * 60 * 24 * 7 // 1 week
    })

    response.cookies.set("user_session", JSON.stringify({ id: user.id, role: user.role, organizationId: user.organizationId }), {
      httpOnly: true,
      path: "/",
      sameSite: "strict",
      maxAge: 60 * 60 * 24 * 7
    })

    return response
  } catch (error) {
    console.error("[v0] Login error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
