"use server"

import { getDB } from "@/lib/db"
import { getSessionUser, getSessionOrganizationId } from "@/lib/session"
import { ObjectId } from "mongodb"

// Get comprehensive dashboard data for student
export async function getStudentDashboardData() {
    const db = await getDB()
    const sessionUser = await getSessionUser()

    if (!sessionUser || sessionUser.role !== "student") {
        throw new Error("Unauthorized: Not a student")
    }

    // Fetch student with full details
    let student = await db.collection("users").findOne({ id: sessionUser.id, role: "student" })
    if (!student) {
        student = await db.collection("users").findOne({ _id: new ObjectId(sessionUser.id), role: "student" })
    }

    if (!student) throw new Error("Student not found")

    const studentId = student.id || student._id.toString()
    const orgId = student.organizationId

    // Fetch related data in parallel
    const [department, classInfo, todaySlots, attendanceRecords, leaderboard] = await Promise.all([
        student.departmentId ? db.collection("departments").findOne({ id: student.departmentId }) : null,
        student.classId ? db.collection("classes").findOne({ id: student.classId }) : null,
        // Today's slots
        db.collection("slots").find({
            classId: student.classId,
            day: new Date().toLocaleDateString('en-US', { weekday: 'long' }),
            organizationId: orgId,
            isActive: true
        }).toArray(),
        // All attendance records
        db.collection("attendance").find({ studentId }).sort({ timestamp: -1 }).limit(100).toArray(),
        // Leaderboard for class
        db.collection("users").find({
            role: "student",
            classId: student.classId,
            organizationId: orgId
        }).sort({ points: -1 }).limit(10).toArray()
    ])

    // Calculate stats
    const totalRecords = attendanceRecords.length
    const presentCount = attendanceRecords.filter(r => r.status === "present").length
    const lateCount = attendanceRecords.filter(r => r.status === "late").length
    const attendanceRate = totalRecords > 0 ? Math.round((presentCount / totalRecords) * 100) : 0

    // Calculate streak
    let currentStreak = 0
    const sortedRecords = [...attendanceRecords].sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
    for (const record of sortedRecords) {
        if (record.status === "present") {
            currentStreak++
        } else {
            break
        }
    }

    // Get student's rank
    const studentRank = leaderboard.findIndex(s => (s.id || s._id.toString()) === studentId) + 1

    // Today's attendance
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)
    const todayAttendance = attendanceRecords.filter(r =>
        new Date(r.timestamp) >= startOfDay
    )

    // Recent achievements (mock for now - can be enhanced)
    const achievements = []
    if (currentStreak >= 7) {
        achievements.push({
            id: "streak-7",
            name: "Week Warrior",
            description: "7 day attendance streak",
            icon: "🔥",
            points: 50
        })
    }
    if (attendanceRate >= 90) {
        achievements.push({
            id: "attendance-90",
            name: "Attendance Champion",
            description: "90%+ attendance rate",
            icon: "🏆",
            points: 100
        })
    }

    return {
        student: {
            ...student,
            id: studentId,
            departmentName: department?.name || "Unknown",
            departmentCode: department?.code || "N/A",
            className: classInfo?.name || "Unassigned"
        },
        stats: {
            points: student.points || 0,
            attendanceRate,
            currentStreak,
            rank: studentRank || "N/A",
            totalClasses: totalRecords,
            presentCount,
            lateCount
        },
        todaySchedule: todaySlots.map(slot => ({
            id: slot.id || slot._id.toString(),
            courseName: slot.currentSubject || slot.courseName || "Unknown",
            courseCode: slot.courseCode || "N/A",
            startTime: slot.startTime,
            endTime: slot.endTime,
            room: slot.room || "TBA",
            attended: todayAttendance.some(a => a.slotId === (slot.id || slot._id.toString()))
        })),
        achievements,
        leaderboard: leaderboard.slice(0, 5).map((s, idx) => ({
            rank: idx + 1,
            studentId: s.id || s._id.toString(),
            studentName: s.name,
            points: s.points || 0,
            attendanceRate: 85, // Can calculate if needed
            streak: 5, // Can calculate if needed
            isCurrentUser: (s.id || s._id.toString()) === studentId
        })),
        recentAttendance: attendanceRecords.slice(0, 5).map(r => ({
            id: r.id || r._id.toString(),
            date: r.timestamp,
            status: r.status,
            points: r.pointsEarned || 0
        }))
    }
}

// Get weekly attendance chart data
export async function getWeeklyAttendanceChart() {
    const sessionUser = await getSessionUser()
    if (!sessionUser || sessionUser.role !== "student") {
        throw new Error("Unauthorized")
    }

    const db = await getDB()
    const studentId = sessionUser.id

    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const records = await db.collection("attendance").aggregate([
        {
            $match: {
                studentId,
                timestamp: { $gte: sevenDaysAgo }
            }
        },
        {
            $group: {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
                present: { $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] } },
                late: { $sum: { $cond: [{ $eq: ["$status", "late"] }, 1, 0] } },
                absent: { $sum: { $cond: [{ $eq: ["$status", "absent"] }, 1, 0] } }
            }
        },
        { $sort: { _id: 1 } }
    ]).toArray()

    return records.map((r: any) => ({
        date: r._id,
        present: r.present,
        late: r.late,
        absent: r.absent
    }))
}
