"use server"

import { getDB } from "@/lib/db"
import { ObjectId } from "mongodb"

import { getSessionOrganizationId } from "@/lib/session"

// Types for Filters
export interface AttendanceFilter {
    department?: string
    year?: number
    semester?: number
    startDate?: Date
    endDate?: Date
    organizationId?: string
}

// 1. Department Wise Summary
export async function getDepartmentAttendanceSummary(filters: AttendanceFilter) {
    const db = await getDB()
    const { department, year, semester, startDate, endDate } = filters
    const orgId = filters.organizationId || await getSessionOrganizationId()

    // Build Match Stage
    const matchStage: any = { organizationId: orgId }
    if (startDate && endDate) {
        matchStage.timestamp = { $gte: startDate, $lte: endDate }
    }

    // Pipeline
    const pipeline: any[] = [
        { $match: matchStage },
        {
            $lookup: {
                from: "users",
                localField: "studentId",
                foreignField: "id",
                as: "student"
            }
        },
        { $unwind: "$student" },
        // Filter by Student Details if needed
        ...(department ? [{ $match: { "student.department": department } }] : []),
        ...(year ? [{ $match: { "student.year": year } }] : []),
        ...(semester ? [{ $match: { "student.semester": semester } }] : []),

        // Group by Department
        {
            $group: {
                _id: "$student.department",
                totalPresent: { $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] } },
                totalLate: { $sum: { $cond: [{ $eq: ["$status", "late"] }, 1, 0] } },
                totalAbsent: { $sum: { $cond: [{ $eq: ["$status", "absent"] }, 1, 0] } },
                totalRecords: { $sum: 1 },
                uniqueStudents: { $addToSet: "$student.id" }
            }
        },
        {
            $project: {
                department: "$_id",
                present: "$totalPresent",
                late: "$totalLate",
                absent: "$totalAbsent",
                total: "$totalRecords",
                studentCount: { $size: "$uniqueStudents" },
                attendanceRate: {
                    $cond: [
                        { $eq: ["$totalRecords", 0] },
                        0,
                        { $multiply: [{ $divide: ["$totalPresent", "$totalRecords"] }, 100] }
                    ]
                }
            }
        }
    ]

    const result = await db.collection("attendance").aggregate(pipeline).toArray()
    return result
}

// 2. Detailed Report for Export
export async function getDetailedAttendanceReport(type: "monthly" | "daily", filters: AttendanceFilter) {
    const db = await getDB()
    const { department, year, semester, startDate, endDate } = filters
    const orgId = filters.organizationId || await getSessionOrganizationId()

    // Base Match
    const matchStage: any = { organizationId: orgId }
    if (startDate && endDate) {
        matchStage.timestamp = { $gte: startDate, $lte: endDate }
    } else if (type === 'daily') {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        matchStage.timestamp = { $gte: today }
    }

    const pipeline: any[] = [
        { $match: matchStage },
        {
            $lookup: {
                from: "users",
                localField: "studentId",
                foreignField: "id",
                as: "student"
            }
        },
        { $unwind: "$student" },
        // Apply User Filters
        ...(department ? [{ $match: { "student.department": department } }] : []),
        ...(year ? [{ $match: { "student.year": year } }] : []),
        ...(semester ? [{ $match: { "student.semester": semester } }] : []),

        {
            $lookup: {
                from: "slots",
                localField: "slotId",
                foreignField: "id", // Assuming id string match, fallback to _id if mixed
                as: "slot"
            }
        },
        { $unwind: { path: "$slot", preserveNullAndEmptyArrays: true } },

        { $sort: { timestamp: -1 } },

        {
            $project: {
                date: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
                time: { $dateToString: { format: "%H:%M:%S", date: "$timestamp" } },
                studentName: "$student.name",
                studentId: "$student.id",
                department: "$student.department",
                course: "$slot.courseName",
                status: "$status",
                points: "$pointsEarned"
            }
        }
    ]

    const data = await db.collection("attendance").aggregate(pipeline).toArray()
    return data
}

export async function getRecentAttendance(limit = 10) {
    const db = await getDB()
    const sessionOrgId = await getSessionOrganizationId()

    const recentLogs = await db.collection("attendance").aggregate([
        { $match: { organizationId: sessionOrgId } },
        { $sort: { timestamp: -1 } },
        { $limit: limit },
        {
            $lookup: {
                from: "users",
                localField: "studentId",
                foreignField: "id",
                as: "user"
            }
        },
        { $unwind: "$user" },
        {
            $lookup: {
                from: "slots",
                localField: "slotId",
                foreignField: "id",
                as: "slot"
            }
        },
        { $unwind: { path: "$slot", preserveNullAndEmptyArrays: true } }
    ]).toArray()

    return recentLogs.map((log: any) => ({
        id: log._id.toString(),
        user: log.user.name,
        userAvatar: log.user.avatar,
        action: log.status === 'present' ? 'Checked In' : 'Marked Late',
        time: new Date(log.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        timestamp: log.timestamp, // Keep raw date for sorting/formatting if needed
        status: log.status === 'present' ? 'success' : 'warning',
        points: log.pointsEarned,
        course: log.slot?.courseName || "General"
    }))
}

// 3. Main Dashboard Stats
export async function getAttendanceDashboardStats(organizationId?: string) {
    const db = await getDB()
    const orgId = organizationId || await getSessionOrganizationId()

    // 1. Total Students
    const totalStudents = await db.collection("users").countDocuments({ role: "student", organizationId: orgId })

    // 2. Total Departments
    const totalDepartments = await db.collection("departments").countDocuments({ organizationId: orgId })

    // 3. Overall Attendance % (simplified calc for all time, normally windowed)
    const attendanceStats = await db.collection("attendance").aggregate([
        { $match: { organizationId: orgId } },
        {
            $group: {
                _id: null,
                total: { $sum: 1 },
                present: { $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] } }
            }
        }
    ]).toArray()

    let overallPercentage = 0
    if (attendanceStats.length > 0 && attendanceStats[0].total > 0) {
        overallPercentage = (attendanceStats[0].present / attendanceStats[0].total) * 100
    }

    // 4. Students Below 75% (Defaulters)
    // This is expensive: grouping all attendance by student. 
    // Optimization: Run this periodically in background or cache.
    // For now, on-the-fly aggregation:
    const defaulters = await db.collection("attendance").aggregate([
        { $match: { organizationId: orgId } },
        {
            $group: {
                _id: "$studentId",
                total: { $sum: 1 },
                present: { $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] } }
            }
        },
        {
            $project: {
                attendanceRate: { $multiply: [{ $divide: ["$present", "$total"] }, 100] }
            }
        },
        {
            $match: { attendanceRate: { $lt: 75 } }
        },
        { $count: "count" }
    ]).toArray()

    const defaultersCount = defaulters.length > 0 ? defaulters[0].count : 0

    return {
        totalStudents,
        totalDepartments,
        overallPercentage: Math.round(overallPercentage),
        defaultersCount
    }
}


// --- Universal Search ---
export async function globalSearch(query: string, organizationId?: string) {
    const db = await getDB()
    const orgId = organizationId || await getSessionOrganizationId()
    const term = new RegExp(query, "i")

    try {
        // 1. Search Students
        const students = await db.collection("users").find({
            role: "student",
            organizationId: orgId,
            $or: [{ name: term }, { email: term }, { id: term }]
        }).limit(5).toArray()

        // 2. Search Departments
        const departments = await db.collection("departments").find({
            organizationId: orgId,
            $or: [{ name: term }, { code: term }]
        }).limit(3).toArray()

        // 3. Search Courses/Subjects
        const courses = await db.collection("slots").find({ // Note: original code queried 'slots' for courses. Might mean 'college_slots'? 
            // Assuming 'slots' refers to college_slots or timetable entries. original used "college_slots" in other files, here "slots". 
            // Checking file usage... file uses "slots" down below? No "slots" collection. Types usually say college_slots. 
            // Keeping "slots" as per existing but adding filter if it exists.
            organizationId: orgId,
            $or: [{ courseName: term }, { courseCode: term }]
        }).limit(3).toArray()

        const uniqueCoursesMap = new Map();
        courses.forEach(c => {
            if (!uniqueCoursesMap.has(c.courseCode)) uniqueCoursesMap.set(c.courseCode, c);
        });
        const uniqueCourses = Array.from(uniqueCoursesMap.values());

        return {
            students: students.map(s => ({ id: s.id || s._id.toString(), name: s.name, type: "student", detail: s.department })),
            departments: departments.map(d => ({ id: d.id || d._id.toString(), name: d.name, type: "department", detail: d.code })),
            courses: uniqueCourses.map(c => ({ id: c.id || c._id.toString(), name: c.courseName, type: "subject", detail: c.courseCode }))
        }
    } catch (error) {
        console.error("Global search error:", error)
        return { students: [], departments: [], courses: [] }
    }
}
