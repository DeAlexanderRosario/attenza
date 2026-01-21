import { type NextRequest, NextResponse } from "next/server"
import { getLeaderboard } from "@/lib/db-helpers"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const filters: any = {}

    if (searchParams.get("department")) filters.department = searchParams.get("department")
    if (searchParams.get("year")) filters.year = Number.parseInt(searchParams.get("year")!)
    if (searchParams.get("semester")) filters.semester = Number.parseInt(searchParams.get("semester")!)

    const leaderboard = await getLeaderboard(filters)
    return NextResponse.json(leaderboard)
  } catch (error) {
    console.error("[v0] Get leaderboard error:", error)
    return NextResponse.json({ error: "Failed to fetch leaderboard" }, { status: 500 })
  }
}
