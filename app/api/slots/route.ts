import { type NextRequest, NextResponse } from "next/server"
import { getSlots, createSlot } from "@/lib/db-helpers"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const filters: any = {}

    if (searchParams.get("department")) filters.department = searchParams.get("department")
    if (searchParams.get("year")) filters.year = Number.parseInt(searchParams.get("year")!)
    if (searchParams.get("semester")) filters.semester = Number.parseInt(searchParams.get("semester")!)

    const slots = await getSlots(filters)
    return NextResponse.json(slots)
  } catch (error) {
    console.error("[v0] Get slots error:", error)
    return NextResponse.json({ error: "Failed to fetch slots" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const slotData = await request.json()
    const slot = await createSlot(slotData)
    return NextResponse.json(slot)
  } catch (error) {
    console.error("[v0] Create slot error:", error)
    return NextResponse.json({ error: "Failed to create slot" }, { status: 500 })
  }
}
