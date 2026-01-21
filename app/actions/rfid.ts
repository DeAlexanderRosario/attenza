"use server"

import { getDB } from "@/lib/db"
import { revalidatePath } from "next/cache"

export async function simulateRFIDScan(rfidTag: string, roomId: string) {
    const db = await getDB()

    // 1. Identify Teacher
    const teacher = await db.collection("users").findOne({ rfidTag, role: "teacher" })
    if (!teacher) {
        return { success: false, message: "Invalid RFID: Teacher not found" }
    }

    // 2. Identify Current Time Slot in the Room
    // For demo, we might just grab the first 'Active' slot in that room or match time
    // Simplifying to find ANY active slot in the room for Today
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' })

    // In a real app, match current time vs slot start/end
    const slot = await db.collection("slots").findOne({
        room: roomId,
        day: today,
        isActive: true
        // In real app add: startTime <= now <= endTime
    })

    if (!slot) {
        return { success: false, message: "No active class scheduled in this room right now." }
    }

    // 3. Update Slot Status
    // If Scheduled Teacher != Scanned Teacher, it's a substitution
    const isSubstitution = slot.teacherId !== teacher.id

    await db.collection("slots").updateOne(
        { _id: slot._id },
        {
            $set: {
                status: "Conducted",
                currentTeacherId: teacher.id, // Track who actually took the class
                currentSubject: teacher.department === "General" ? "Substituted Class" : slot.courseName // Simple logic
            }
        }
    )

    // 4. Log Attendance (Teacher Present)
    // await logTeacherAttendance(teacher.id, slot._id)

    revalidatePath("/dashboard/admin")
    revalidatePath("/dashboard/student")

    return {
        success: true,
        message: `Welcome ${teacher.name}. Class ${slot.courseCode} started.`,
        details: isSubstitution ? "Substitution Recorded" : "On Time"
    }
}
