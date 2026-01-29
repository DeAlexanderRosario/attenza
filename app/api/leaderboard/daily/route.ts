import { type NextRequest, NextResponse } from "next/server"
import { getDailyLeaderboard } from "@/lib/db-helpers"
import { getSessionUser } from "@/lib/session"

export async function GET(request: NextRequest) {
    try {
        const sessionUser = await getSessionUser()
        if (!sessionUser) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const filters = {
            organizationId: sessionUser.organizationId,
            departmentId: sessionUser.departmentId,
            classId: sessionUser.classId
        }

        const leaderboard = await getDailyLeaderboard(filters)
        return NextResponse.json(leaderboard)
    } catch (error) {
        console.error("[v0] Get daily leaderboard error:", error)
        return NextResponse.json({ error: "Failed to fetch daily leaderboard" }, { status: 500 })
    }
}
