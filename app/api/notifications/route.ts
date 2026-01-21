import { type NextRequest, NextResponse } from "next/server"
import { getNotifications, markNotificationRead } from "@/lib/db-helpers"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get("userId")
    const unreadOnly = searchParams.get("unreadOnly") === "true"

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 })
    }

    const notifications = await getNotifications(userId, unreadOnly)
    return NextResponse.json(notifications)
  } catch (error) {
    console.error("[v0] Get notifications error:", error)
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { id } = await request.json()
    await markNotificationRead(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Mark notification read error:", error)
    return NextResponse.json({ error: "Failed to mark notification as read" }, { status: 500 })
  }
}
