import { NextResponse } from "next/server"
import { getAchievements } from "@/lib/db-helpers"

export async function GET() {
  try {
    const achievements = await getAchievements()
    return NextResponse.json(achievements)
  } catch (error) {
    console.error("[v0] Get achievements error:", error)
    return NextResponse.json({ error: "Failed to fetch achievements" }, { status: 500 })
  }
}
