"use server"

import { getDB } from "@/lib/db"
import { AttendanceRecord, DailyGamification, Notification, User, Slot } from "@/lib/types"
import { ObjectId } from "mongodb"
// import { getTimeSlots } from "./admin" // Deprecated for new system?
import { getCollegeSlots } from "./class-slots" // New slot system
import { getSessionUser } from "@/lib/session"

// --- HELPERS ---

async function getCurrentStudent() {
    const sessionUser = await getSessionUser()
    if (!sessionUser) return null // throw new Error("Unauthorized")

    const db = await getDB()
    let targetUser = await db.collection<User>("users").findOne({ id: sessionUser.id })
    if (!targetUser) targetUser = await db.collection<User>("users").findOne({ _id: new ObjectId(sessionUser.id) })

    if (targetUser && targetUser.role !== "student") return null

    return targetUser ? { ...targetUser, id: targetUser.id || targetUser._id.toString() } : null
}

// --- ATTENDANCE MARKING LOGIC ---

export async function markAttendance(rfidTag: string) {
    const db = await getDB()
    const now = new Date()
    const currentTimeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) // "09:30"
    const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' })

    // 1. Identify User
    const user = await db.collection<User>("users").findOne({ rfidTag })
    if (!user) return { success: false, message: "Invalid RFID Tag" }

    // 2. Identify Current College Slot
    // Using the NEW College-Wide Slots
    const collegeSlots = await getCollegeSlots()
    const activeSlot = collegeSlots.find(s =>
        s.type === "CLASS" &&
        currentTimeStr >= s.startTime &&
        currentTimeStr <= s.endTime
    )

    if (!activeSlot) {
        return { success: false, message: "No class period active right now." }
    }

    // 3. Find Timetable Entry for this Student's Class & Slot
    if (!user.classId) return { success: false, message: "Student not assigned to a class." }

    const timetableEntry = await db.collection("timetable_entries").findOne({
        classId: user.classId,
        classSlotId: activeSlot.id,
        dayOfWeek: currentDay
    })

    if (!timetableEntry) {
        // It's a free period or no subject assigned
        return { success: false, message: "Free period. No attendance required." }
    }

    // 4. Check for Duplicate Entry
    const startOfDay = new Date(now)
    startOfDay.setHours(0, 0, 0, 0)

    const existingRecord = await db.collection("attendance").findOne({
        studentId: user.id || user._id.toString(),
        slotId: timetableEntry.classSlotId, // Tracking by Slot ID (Time Block)
        timestamp: { $gte: startOfDay }
    })

    if (existingRecord) {
        return { success: false, message: "Attendance already marked." }
    }

    // 5. Grace Period Logic
    const [startHour, startMin] = activeSlot.startTime.split(':').map(Number)
    const slotStartTime = new Date(now)
    slotStartTime.setHours(startHour, startMin, 0, 0)

    const diffMinutes = (now.getTime() - slotStartTime.getTime()) / 60000

    let status: "present" | "late" | "absent" = "present"
    let points = 10 // Base points

    if (diffMinutes <= 15) {
        status = "present"
        points = 10
    } else if (diffMinutes <= 45) {
        status = "late"
        points = 5
    } else {
        status = "late" // Or absent?
        points = 2
    }

    // 6. Record Attendance
    const newRecord: AttendanceRecord = {
        id: crypto.randomUUID(),
        studentId: user.id || user._id.toString(),
        slotId: activeSlot.id,
        rfidTag,
        timestamp: now,
        status,
        pointsEarned: points,
        organizationId: user.organizationId
    }

    await db.collection("attendance").insertOne(newRecord)

    // 7. Update User Points
    await db.collection("users").updateOne(
        { id: user.id },
        { $inc: { points: points } }
    )

    return {
        success: true,
        message: `Marked ${status.toUpperCase()}`,
        user: user.name,
        points
    }
}

export async function updateStudentPassword(data: { current: string, new: string }) {
    const student = await getCurrentStudent()
    if (!student) return { success: false, message: "Unauthorized" }

    const db = await getDB()
    const user = await db.collection("users").findOne({ id: student.id })

    // In production, use bcrypt.compare
    if (!user || user.password !== data.current) {
        return { success: false, message: "Current password is incorrect" }
    }

    await db.collection("users").updateOne(
        { id: student.id },
        { $set: { password: data.new } }
    )

    return { success: true, message: "Password updated successfully" }
}

export async function submitWordGuess(guess: string) {
    const student = await getCurrentStudent()
    if (!student) return { success: false, message: "Unauthorized" }

    // Mock logic for "Algorithm" based on UI hint
    const TARGET_WORD = "ALGORITHM"

    if (guess.toUpperCase().trim() === TARGET_WORD) {
        // Award points?
        // const db = await getDB()
        // await db.collection("users").updateOne({ id: student.id }, { $inc: { points: 50 } })

        return { success: true, message: "Correct! +50 Points" }
    }

    return { success: false, message: "Incorrect, try again." }
}


// --- DASHBOARD DATA & NEW EXPORTS ---

export async function getStudentDashboardData() {
    const student = await getCurrentStudent()
    if (!student) throw new Error("Unauthorized")

    // Reuse specific functions
    const slots = await getStudentTimetable()
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' })
    const todaySlots = slots.filter(s => s.day === today)

    const db = await getDB()
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)

    // Fetch today's attendance
    const todayAttendance = await db.collection("attendance").find({
        studentId: student.id,
        timestamp: { $gte: startOfDay }
    }).toArray()

    const sanitizedAttendance = todayAttendance.map(a => ({ ...a, id: a.id || a._id.toString() })) as unknown as AttendanceRecord[]

    // Stats
    const totalAttendanceCount = await db.collection("attendance").countDocuments({ studentId: student.id })
    // Simple mock logic for 'total potential classes' for now
    const totalPotential = totalAttendanceCount + 5
    const overallPct = totalPotential > 0 ? Math.round((totalAttendanceCount / totalPotential) * 100) : 100

    return {
        user: student,
        todaySlots,
        todayAttendance: sanitizedAttendance,
        stats: {
            overall: overallPct,
            attended: todayAttendance.length,
            total: todaySlots.length,
            status: overallPct >= 75 ? "Safe" : "At Risk"
        },
        subjectsAtRisk: []
    }
}

export async function getAttendanceHistory() {
    const student = await getCurrentStudent()
    if (!student) return []

    // For now, returning mock history data suitable for the chart
    // Real implementation would aggregate daily attendance
    return [
        { date: "Mon", present: 4, absent: 0, late: 1 },
        { date: "Tue", present: 5, absent: 0, late: 0 },
        { date: "Wed", present: 3, absent: 1, late: 1 },
        { date: "Thu", present: 5, absent: 0, late: 0 },
        { date: "Fri", present: 4, absent: 1, late: 0 },
        { date: "Sat", present: 2, absent: 0, late: 0 },
    ]
}

export async function getDetailedAttendance() {
    const student = await getCurrentStudent()
    if (!student) return []

    const db = await getDB()
    const records = await db.collection("attendance")
        .find({ studentId: student.id })
        .sort({ timestamp: -1 })
        .limit(50)
        .toArray()

    // Enrich with slot details if possible
    // For now returning raw records adjusted for UI
    return records.map(r => ({
        id: r.id || r._id.toString(),
        date: r.timestamp, // UI expects date object or string
        status: r.status,
        subject: "General", // TODO: Join with timetable to get subject
        time: r.timestamp.toLocaleTimeString(),
        points: r.pointsEarned
    }))
}

export async function getStudentTimetable(): Promise<Slot[]> {
    const student = await getCurrentStudent()
    if (!student || !student.classId) return []

    const db = await getDB()

    // New Architecture: Join College Slots + Timetable Entries
    const collegeSlots = await db.collection("college_slots").find({ isActive: true }).toArray()
    const timetableEntries = await db.collection("timetable_entries").find({
        classId: student.classId,
        isActive: true
    }).toArray()

    // Map to the OLD 'Slot' interface expected by UI
    const mappedSlots: Slot[] = []

    for (const entry of timetableEntries) {
        const slotConfig = collegeSlots.find(s => s.id === entry.classSlotId)
        if (!slotConfig) continue

        mappedSlots.push({
            id: entry.id || entry._id.toString(),
            name: entry.subjectName,
            courseCode: entry.subjectCode,
            courseName: entry.subjectName,
            teacherId: entry.teacherId,
            classId: entry.classId,
            day: entry.dayOfWeek,             // e.g. "Monday"
            startTime: slotConfig.startTime,  // "09:00"
            endTime: slotConfig.endTime,      // "10:00"
            room: entry.room || "TBD",
            department: student.department || "General",
            year: student.year || 1,
            semester: student.semester || 1,
            isLastSlot: false,
            isActive: true,
            status: entry.status || "Scheduled",
            organizationId: student.organizationId
        })
    }

    // Sort by day and time?
    // The UI handles filtering by day usually.
    return mappedSlots
}
