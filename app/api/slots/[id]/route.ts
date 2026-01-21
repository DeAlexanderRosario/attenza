import { type NextRequest, NextResponse } from "next/server"
import { getSlotById, updateSlot, deleteSlot } from "@/lib/db-helpers"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const slot = await getSlotById(id)

    if (!slot) {
      return NextResponse.json({ error: "Slot not found" }, { status: 404 })
    }

    return NextResponse.json(slot)
  } catch (error) {
    console.error("[v0] Get slot error:", error)
    return NextResponse.json({ error: "Failed to fetch slot" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const updates = await request.json()
    await updateSlot(id, updates)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Update slot error:", error)
    return NextResponse.json({ error: "Failed to update slot" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await deleteSlot(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Delete slot error:", error)
    return NextResponse.json({ error: "Failed to delete slot" }, { status: 500 })
  }
}
