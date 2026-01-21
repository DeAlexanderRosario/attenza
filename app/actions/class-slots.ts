"use server"

import { getDB } from "@/lib/db"
import { ClassSlot } from "@/lib/types"
import crypto from "crypto"
import { getSessionOrganizationId } from "@/lib/session"

// Get all college-wide slots
export async function getCollegeSlots(organizationId?: string): Promise<ClassSlot[]> {
    const db = await getDB()
    const orgId = organizationId || await getSessionOrganizationId()

    const slots = await db.collection("college_slots")
        .find({ isActive: true, organizationId: orgId })
        .sort({ slotNumber: 1 })
        .toArray()

    return slots.map(s => ({
        id: s.id || s._id.toString(),
        slotNumber: s.slotNumber || 0,
        startTime: s.startTime || "",
        endTime: s.endTime || "",
        duration: s.duration || 0,
        type: s.type || "CLASS",
        isActive: s.isActive !== false,
        organizationId: s.organizationId || orgId,
        createdAt: s.createdAt || new Date(),
        updatedAt: s.updatedAt
    }))
}

// Create new college-wide time slot
export async function createCollegeSlot(data: {
    startTime: string
    endTime: string
    type: "CLASS" | "BREAK" | "LUNCH" | "FREE"
    organizationId?: string
}) {
    const db = await getDB()
    const orgId = data.organizationId || await getSessionOrganizationId()

    // Calculate duration
    const start = new Date(`2000-01-01 ${data.startTime}`)
    const end = new Date(`2000-01-01 ${data.endTime}`)
    const duration = Math.round((end.getTime() - start.getTime()) / 60000) // minutes

    // Check for overlaps
    const existingSlots = await getCollegeSlots(orgId)
    const hasOverlap = existingSlots.some(slot => {
        return (data.startTime < slot.endTime && data.endTime > slot.startTime)
    })

    if (hasOverlap) {
        return { success: false, error: "Time slot overlaps with existing slot" }
    }

    // Get next slot number
    const maxSlotNumber = existingSlots.length > 0
        ? Math.max(...existingSlots.map(s => s.slotNumber))
        : 0

    const newSlot: ClassSlot = {
        id: crypto.randomUUID(),
        slotNumber: maxSlotNumber + 1,
        startTime: data.startTime,
        endTime: data.endTime,
        duration,
        type: data.type,
        isActive: true,
        createdAt: new Date(),
        // @ts-ignore
        organizationId: orgId
    }

    await db.collection("college_slots").insertOne(newSlot)
    return { success: true, slot: newSlot }
}

// Update slot
export async function updateCollegeSlot(id: string, data: {
    startTime?: string
    endTime?: string
    type?: "CLASS" | "BREAK" | "LUNCH" | "FREE"
}) {
    const db = await getDB()

    let updateData: any = { ...data }

    // Recalculate duration if time changed
    if (data.startTime && data.endTime) {
        const start = new Date(`2000-01-01 ${data.startTime}`)
        const end = new Date(`2000-01-01 ${data.endTime}`)
        updateData.duration = Math.round((end.getTime() - start.getTime()) / 60000)
    }

    updateData.updatedAt = new Date()

    const result = await db.collection("college_slots").updateOne(
        { id },
        { $set: updateData }
    )

    if (result.matchedCount === 0) {
        return { success: false, error: "Slot not found" }
    }

    return { success: true }
}

// Delete slot with cascading deletion
export async function deleteCollegeSlot(id: string, forceDelete: boolean = false) {
    const db = await getDB()
    const orgId = await getSessionOrganizationId()

    // Get slot details
    const slot = await db.collection("college_slots").findOne({ id, organizationId: orgId })
    if (!slot) {
        return { success: false, error: "Slot not found" }
    }

    // Find all classes that use this slot
    const classes = await db.collection("classes")
        .find({
            organizationId: orgId,
            "timetable.classSlotId": id
        })
        .toArray()

    // Count total entries
    let entriesCount = 0
    classes.forEach(c => {
        const entries = (c.timetable || []).filter((e: any) => e.classSlotId === id)
        entriesCount += entries.length
    })

    if (entriesCount > 0 && !forceDelete) {
        return {
            success: false,
            error: `Cannot delete: ${entriesCount} timetable entries across ${classes.length} classes use this slot`,
            hasEntries: true,
            entriesCount,
            affectedClasses: classes.map(c => ({ id: c.id, name: c.name }))
        }
    }

    // CASCADE DELETE: Remove all timetable entries for this slot from all classes
    if (entriesCount > 0) {
        await db.collection("classes").updateMany(
            { organizationId: orgId },
            { $pull: { timetable: { classSlotId: id } } } as any
        )
    }

    // Soft delete the slot
    const result = await db.collection("college_slots").updateOne(
        { id, organizationId: orgId },
        { $set: { isActive: false, updatedAt: new Date() } }
    )

    if (result.matchedCount === 0) {
        return { success: false, error: "Slot not found" }
    }

    return {
        success: true,
        deletedEntriesCount: entriesCount,
        message: entriesCount > 0
            ? `Slot deleted successfully. ${entriesCount} timetable entries were also removed.`
            : "Slot deleted successfully."
    }
}

// Get usage statistics for all slots
export async function getSlotUsageStats(organizationId?: string) {
    const db = await getDB()
    const orgId = organizationId || await getSessionOrganizationId()

    const slots = await getCollegeSlots(orgId)
    const stats = []

    for (const slot of slots) {
        // Find all classes that use this slot
        const classes = await db.collection("classes")
            .find({
                organizationId: orgId,
                "timetable.classSlotId": slot.id
            })
            .toArray()

        // Count total entries across all classes
        let totalEntries = 0
        classes.forEach(c => {
            const entries = (c.timetable || []).filter((e: any) => e.classSlotId === slot.id)
            totalEntries += entries.length
        })

        stats.push({
            slotId: slot.id,
            slotNumber: slot.slotNumber,
            startTime: slot.startTime,
            endTime: slot.endTime,
            type: slot.type,
            totalEntries,
            classesCount: classes.length,
            isUsed: totalEntries > 0
        })
    }

    return stats
}
