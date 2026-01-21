import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function POST() {
    try {
        const cookieStore = await cookies()
        cookieStore.delete("user_session")
        cookieStore.delete("organizationId")

        return NextResponse.json({ success: true })
    } catch (error) {
        return NextResponse.json({ error: "Failed to logout" }, { status: 500 })
    }
}
