"use server"

import { getDB } from "@/lib/db"
import { ClassTimetableEntry } from "@/lib/types"
import { getSessionOrganizationId } from "@/lib/session"
import crypto from "crypto"

// Get timetable for a class
export async function getClassTimetable(classId: string, organizationId?: string): Promise<ClassTimetableEntry[]> {
    const db = await getDB()
    const orgId = organizationId || await getSessionOrganizationId()

    const classDoc = await db.collection("classes").findOne({
        id: classId,
        organizationId: orgId
    })

    if (!classDoc) return []

    return classDoc.timetable || []
}

// Create timetable entry for a class
export async function createTimetableEntry(data: {
    classId: string
    classSlotId: string
    dayOfWeek: string
    subjectName: string
    subjectCode: string
    teacherId: string
    subjectId?: string
    room?: string
    organizationId?: string
}) {
    const db = await getDB()
    const orgId = data.organizationId || await getSessionOrganizationId()

    // Validate that the slot exists and belongs to this organization
    const slot = await db.collection("college_slots").findOne({
        id: data.classSlotId,
        organizationId: orgId,
        isActive: true
    })

    if (!slot) {
        return {
            success: false,
            error: "Invalid slot: Slot does not exist or is not active for this organization"
        }
    }

    // Get current class timetable
    const classDoc = await db.collection("classes").findOne({
        id: data.classId,
        organizationId: orgId
    })

    if (!classDoc) {
        return { success: false, error: "Class not found" }
    }

    const currentTimetable = classDoc.timetable || []

    // Check if entry already exists for this class/slot/day
    const existing = currentTimetable.find((e: ClassTimetableEntry) =>
        e.classSlotId === data.classSlotId && e.dayOfWeek === data.dayOfWeek
    )

    if (existing) {
        return {
            success: false,
            error: "A timetable entry already exists for this slot and day"
        }
    }

    const newEntry: ClassTimetableEntry = {
        id: crypto.randomUUID(),
        classSlotId: data.classSlotId,
        dayOfWeek: data.dayOfWeek,
        subjectId: data.subjectId,
        subjectName: data.subjectName,
        subjectCode: data.subjectCode,
        teacherId: data.teacherId,
        room: data.room,
        status: "Scheduled"
    }

    // Add entry to class timetable array
    await db.collection("classes").updateOne(
        { id: data.classId, organizationId: orgId },
        { $push: { timetable: newEntry } } as any
    )

    return { success: true, entry: newEntry }
}

// Update timetable entry
export async function updateTimetableEntry(
    classId: string,
    entryId: string,
    data: {
        subjectName?: string
        subjectCode?: string
        teacherId?: string
        subjectId?: string
        room?: string
    },
    organizationId?: string
) {
    const db = await getDB()
    const orgId = organizationId || await getSessionOrganizationId()

    // Update the specific entry in the timetable array
    const result = await db.collection("classes").updateOne(
        {
            id: classId,
            organizationId: orgId,
            "timetable.id": entryId
        },
        {
            $set: {
                "timetable.$.subjectName": data.subjectName,
                "timetable.$.subjectCode": data.subjectCode,
                "timetable.$.teacherId": data.teacherId,
                "timetable.$.subjectId": data.subjectId,
                "timetable.$.room": data.room
            }
        }
    )

    if (result.matchedCount === 0) {
        return { success: false, error: "Entry not found" }
    }

    return { success: true }
}

// Delete timetable entry
export async function deleteTimetableEntry(classId: string, entryId: string, organizationId?: string) {
    const db = await getDB()
    const orgId = organizationId || await getSessionOrganizationId()

    // Remove entry from timetable array
    const result = await db.collection("classes").updateOne(
        { id: classId, organizationId: orgId },
        { $pull: { timetable: { id: entryId } } } as any
    )

    if (result.matchedCount === 0) {
        return { success: false, error: "Class not found" }
    }

    return { success: true }
}

// Get classes affected by a slot (for deletion warnings)
export async function getAffectedClassesBySlot(slotId: string, organizationId?: string) {
    const db = await getDB()
    const orgId = organizationId || await getSessionOrganizationId()

    // Find all classes that have this slot in their timetable
    const classes = await db.collection("classes")
        .find({
            organizationId: orgId,
            "timetable.classSlotId": slotId
        })
        .toArray()

    return classes.map(c => ({
        id: c.id,
        name: c.name,
        departmentCode: c.departmentCode,
        entriesCount: (c.timetable || []).filter((e: ClassTimetableEntry) => e.classSlotId === slotId).length
    }))
}

// Delete all timetable entries for a specific slot (cascading deletion)
export async function deleteTimetableEntriesBySlot(slotId: string, organizationId?: string) {
    const db = await getDB()
    const orgId = organizationId || await getSessionOrganizationId()

    // Remove all entries with this slotId from all classes
    const result = await db.collection("classes").updateMany(
        { organizationId: orgId },
        { $pull: { timetable: { classSlotId: slotId } } } as any
    )

    return {
        success: true,
        modifiedCount: result.modifiedCount
    }
}

// Get all timetable entries for a specific teacher across all classes
export async function getTeacherTimetable(teacherId: string, organizationId?: string): Promise<(ClassTimetableEntry & { classId: string, className: string })[]> {
    const db = await getDB()
    const orgId = organizationId || await getSessionOrganizationId()

    // Find all classes in the organization
    const classes = await db.collection("classes").find({
        organizationId: orgId,
        "timetable.teacherId": teacherId
    }).toArray()

    const teacherEntries: (ClassTimetableEntry & { classId: string, className: string })[] = []

    classes.forEach(cls => {
        if (cls.timetable) {
            cls.timetable.forEach((entry: ClassTimetableEntry) => {
                if (entry.teacherId === teacherId) {
                    teacherEntries.push({
                        ...entry,
                        classId: cls.id,
                        className: cls.name
                    })
                }
            })
        }
    })

    return teacherEntries
}
