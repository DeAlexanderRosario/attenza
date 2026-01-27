import { type NextRequest, NextResponse } from "next/server"
import { getRawUserByEmail } from "@/lib/db-helpers"
import { verifyPassword } from "@/lib/auth-utils"

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    const user = await getRawUserByEmail(email)

    // Verify user exists and check hashed password
    if (!user || !user.password || !verifyPassword(password, user.password)) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    // OPAQUE RESPONSE: No data returned in body
    const response = NextResponse.json({ success: true })

    // Set Cookies for Server Side Access
    response.cookies.set("organizationId", user.organizationId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
    })

    response.cookies.set("user_session", JSON.stringify({
      id: user.id,
      role: user.role,
      organizationId: user.organizationId
    }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
    })

    return response
  } catch (error) {
    console.error("[Auth] Login error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
