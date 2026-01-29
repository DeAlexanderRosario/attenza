"use server"

import { getDB } from "@/lib/db"
import { AttendanceRecord, DailyGamification, Notification, User, Slot } from "@/lib/types"
import { ObjectId } from "mongodb"
// import { getTimeSlots } from "./admin" // Deprecated for new system?
import { getCollegeSlots } from "./class-slots" // New slot system
import { getSessionUser } from "@/lib/session"
import { sanitizeUser } from "@/lib/db-helpers"

// --- HELPERS ---

async function getCurrentStudent() {
    const sessionUser = await getSessionUser()
    if (!sessionUser) return null // throw new Error("Unauthorized")

    const db = await getDB()
    let targetUser = await db.collection<User>("users").findOne({ id: sessionUser.id })
    if (!targetUser) targetUser = await db.collection<User>("users").findOne({ _id: new ObjectId(sessionUser.id) })

    if (targetUser && targetUser.role !== "student") return null
    return sanitizeUser(targetUser) as unknown as User
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
    const totalAttendanceCount = await db.collection("attendance").countDocuments({
        studentId: student.id,
        status: { $in: ["present", "late"] }
    })

    const totalSessionsHeld = await db.collection("active_sessions").countDocuments({
        classId: student.classId,
        status: { $in: ["ACTIVE", "CLOSED"] }
    })

    const overallPct = totalSessionsHeld > 0 ? Math.round((totalAttendanceCount / totalSessionsHeld) * 100) : 100

    // Streak
    const records = await db.collection("attendance")
        .find({ studentId: student.id, status: { $in: ["present", "late"] } })
        .sort({ timestamp: -1 })
        .toArray()

    let streak = 0
    if (records.length > 0) {
        const recordDates = records.map(r => {
            const d = new Date(r.timestamp)
            d.setHours(0, 0, 0, 0)
            return d.getTime()
        })
        const uniqueDates = Array.from(new Set(recordDates))
        const todayAtZero = new Date()
        todayAtZero.setHours(0, 0, 0, 0)
        const yesterdayAtZero = new Date(todayAtZero)
        yesterdayAtZero.setDate(yesterdayAtZero.getDate() - 1)

        let currentDate = todayAtZero
        if (!uniqueDates.includes(todayAtZero.getTime())) {
            if (uniqueDates.includes(yesterdayAtZero.getTime())) {
                currentDate = yesterdayAtZero
            } else {
                streak = 0
            }
        }

        if (streak !== 0 || uniqueDates.includes(currentDate.getTime())) {
            for (let i = 0; i < uniqueDates.length; i++) {
                const d = new Date(currentDate)
                d.setDate(d.getDate() - i)
                if (uniqueDates.includes(d.getTime())) {
                    streak++
                } else {
                    break
                }
            }
        }
    }

    // Leaderboard
    const { getLeaderboard } = await import("@/lib/db-helpers")
    const leaderboard = await getLeaderboard({
        organizationId: student.organizationId,
        departmentId: student.departmentId,
        classId: student.classId
    }, 5) // Limit to top 5 for dashboard

    return {
        user: sanitizeUser(student), // Double ensure plain object
        todaySlots,
        todayAttendance: sanitizedAttendance.map(a => ({
            ...a,
            timestamp: a.timestamp.toISOString() // Serialize dates
        })),
        stats: {
            overall: overallPct,
            attended: totalAttendanceCount,
            total: totalSessionsHeld,
            status: overallPct >= 75 ? "Safe" : "At Risk",
            streak
        },
        leaderboard,
        subjectsAtRisk: []
    }
}

export async function getAttendanceHistory() {
    const student = await getCurrentStudent()
    if (!student) return []

    const db = await getDB()
    const last7Days = new Date()
    last7Days.setDate(last7Days.getDate() - 7)
    last7Days.setHours(0, 0, 0, 0)

    const records = await db.collection("attendance").find({
        studentId: student.id,
        timestamp: { $gte: last7Days }
    }).toArray()

    const dailyData: Record<string, { present: number, absent: number, late: number }> = {}

    // Initialize last 7 days
    for (let i = 0; i < 7; i++) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        const dayName = d.toLocaleDateString('en-US', { weekday: 'short' })
        dailyData[dayName] = { present: 0, absent: 0, late: 0 }
    }

    records.forEach(r => {
        const dayName = new Date(r.timestamp).toLocaleDateString('en-US', { weekday: 'short' })
        if (dailyData[dayName]) {
            if (r.status === "present") dailyData[dayName].present++
            else if (r.status === "late") dailyData[dayName].late++
            else if (r.status === "absent") dailyData[dayName].absent++
        }
    })

    return Object.entries(dailyData).reverse().map(([date, stats]) => ({
        date,
        attended: stats.present + stats.late,
        total: stats.present + stats.late + stats.absent
    }))
}

export async function getDetailedAttendance() {
    const student = await getCurrentStudent()
    if (!student) return []

    const { getStudentAttendanceDetails } = await import("./attendance")
    const details = await getStudentAttendanceDetails(student.id)

    if (!details) return []

    return details.logs.map(log => ({
        id: log.id,
        timestamp: new Date(log.date),
        status: log.status as "present" | "late" | "absent",
        subjectName: log.subject,
        pointsEarned: log.points,
        slotId: "" // Dummy for type compatibility
    })) as any // Using any to bypass strict AttendanceRecord if needed, or we'll update the component
}

export async function getSubjectWiseAttendance() {
    const student = await getCurrentStudent()
    if (!student) return []

    const { getStudentAttendanceDetails } = await import("./attendance")
    const details = await getStudentAttendanceDetails(student.id)

    if (!details) return []

    return details.subjects
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
            classSlotId: entry.classSlotId,
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
