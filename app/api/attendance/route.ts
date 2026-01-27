import { type NextRequest, NextResponse } from "next/server"
import { getAttendanceRecords, createAttendanceRecord } from "@/lib/db-helpers"
import { createNotification } from "@/lib/db-helpers"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const filters: any = {}

    if (searchParams.get("studentId")) filters.studentId = searchParams.get("studentId")
    if (searchParams.get("slotId")) filters.slotId = searchParams.get("slotId")
    if (searchParams.get("startDate")) filters.startDate = new Date(searchParams.get("startDate")!)
    if (searchParams.get("endDate")) filters.endDate = new Date(searchParams.get("endDate")!)

    const records = await getAttendanceRecords(filters)
    return NextResponse.json(records)
  } catch (error) {
    console.error("[v0] Get attendance error:", error)
    return NextResponse.json({ error: "Failed to fetch attendance records" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const recordData = await request.json()
    const record = await createAttendanceRecord(recordData)

    // Create notification for student
    await createNotification({
      userId: recordData.studentId,
      type: "attendance",
      title: "Attendance Recorded",
      message: `Your attendance has been recorded with ${recordData.pointsEarned} points`,
      read: false,
      timestamp: new Date(),
    })

    return NextResponse.json(record)
  } catch (error) {
    console.error("[v0] Create attendance error:", error)
    return NextResponse.json({ error: "Failed to create attendance record" }, { status: 500 })
  }
}
