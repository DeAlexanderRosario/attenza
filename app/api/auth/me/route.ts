import { type NextRequest, NextResponse } from "next/server"
import { getUserById } from "@/lib/db-helpers"
import { cookies } from "next/headers"

export async function GET(request: NextRequest) {
    try {
        const cookieStore = await cookies()
        const sessionCookie = cookieStore.get("user_session")?.value

        if (!sessionCookie) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const session = JSON.parse(sessionCookie)
        const user = await getUserById(session.id)

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 })
        }

        // Returns sanitized user from getUserById (already implements sanitization)
        return NextResponse.json({ user })
    } catch (error) {
        console.error("Auth Me error:", error)
        return NextResponse.json({ error: "Server error" }, { status: 500 })
    }
}
