"use server"

import { getDB } from "@/lib/db"
import { ObjectId } from "mongodb"
import { getSessionOrganizationId } from "@/lib/session"
import { User, AttendanceRecord } from "@/lib/types"
import crypto from "crypto"

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

    // Match Stage (Relaxed to allow records missing explicit organizationId)
    // We will filter by organization AFTER looking up the student
    const matchStage: any = {}
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
        // SECURITY/TARGETING: Filter by student's organization
        { $match: { "student.organizationId": orgId } },
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

    // Base Match (Relaxed to handle records without explicit organizationId)
    const matchStage: any = {}
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
        // SECURITY: Match by student's organization membership
        { $match: { "student.organizationId": orgId } },
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
        { $unwind: "$user" }
    ]).toArray()

    return recentLogs.map((log: any) => ({
        id: log._id.toString(),
        user: log.user.name,
        userAvatar: log.user.avatar,
        action: log.status === 'present' ? 'Checked In' : 'Marked Late',
        time: new Date(log.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        timestamp: log.timestamp,
        status: log.status === 'present' ? 'success' : 'warning',
        points: log.pointsEarned,
        course: log.subjectName || log.subjectCode || "General"
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
// --- Granular Reporting ---

export async function getStudentList(filters: { departmentId?: string, classId?: string, query?: string }) {
    const db = await getDB()
    const sessionOrgId = await getSessionOrganizationId()

    const query: any = { role: "student", organizationId: sessionOrgId }
    if (filters.departmentId && filters.departmentId !== "all") query.departmentId = filters.departmentId
    if (filters.classId && filters.classId !== "all") query.classId = filters.classId
    if (filters.query) {
        query.$or = [
            { name: { $regex: filters.query, $options: "i" } },
            { id: { $regex: filters.query, $options: "i" } },
            { rfidTag: { $regex: filters.query, $options: "i" } }
        ]
    }

    const students = await db.collection("users").find(query).toArray()

    return students.map(s => ({
        id: s.id || s._id.toString(),
        name: s.name,
        email: s.email,
        registerNumber: s.registerNumber,
        departmentId: s.departmentId,
        classId: s.classId,
        rfidTag: s.rfidTag
    }))
}

export async function getStudentAttendanceDetails(userId: string, filters?: { startDate?: Date, endDate?: Date }) {
    const db = await getDB()
    const sessionOrgId = await getSessionOrganizationId()

    // 1. Get Student (Safe lookup)
    let query: any = { organizationId: sessionOrgId };
    if (ObjectId.isValid(userId)) {
        query.$or = [{ id: userId }, { _id: new ObjectId(userId) }];
    } else {
        query.id = userId;
    }

    const student = await db.collection("users").findOne(query);

    if (!student) {
        console.log(`[AttendanceAction] Student not found for ID: ${userId} in Org: ${sessionOrgId}`);
        return null;
    }

    // 2. Get All Attendance Records (Relaxed org check)
    const queryAttend: any = { studentId: student.id || student._id.toString() };
    if (filters?.startDate || filters?.endDate) {
        queryAttend.timestamp = {};
        if (filters.startDate) queryAttend.timestamp.$gte = filters.startDate;
        if (filters.endDate) queryAttend.timestamp.$lte = filters.endDate;
    }

    const attendance = await db.collection("attendance").find(queryAttend).sort({ timestamp: -1 }).toArray()

    // 3. Get All Timetable Entries & Slots for this Class
    const timetable = await db.collection("timetable_entries").find({
        classId: student.classId,
        organizationId: sessionOrgId
    }).toArray()

    const collegeSlots = await db.collection("college_slots").find({ organizationId: sessionOrgId }).toArray();

    // 4. Get Unique Sessions for this Class to calculate "Total Classes Held"
    // A class is "held" if an active_session reached ACTIVE/CLOSED status
    const sessions = await db.collection("active_sessions").find({
        classId: student.classId,
        organizationId: sessionOrgId,
        status: { $in: ["ACTIVE", "CLOSED"] }
    }).toArray();

    // Aggregate by Subject
    const subjectStats: Record<string, { subjectName: string, subjectCode: string, total: number, attended: number }> = {}

    // Initialize with subjects in timetable for baseline (Total Classes)
    timetable.forEach(entry => {
        if (!subjectStats[entry.subjectCode]) {
            subjectStats[entry.subjectCode] = {
                subjectName: entry.subjectName,
                subjectCode: entry.subjectCode,
                total: 0,
                attended: 0
            }
        }
        // Initialize total count based on sessions held for this subject
        const sessionsHeld = sessions.filter(sess =>
            sess.subjectCode === entry.subjectCode || sess.subjectName === entry.subjectName
        ).length;

        subjectStats[entry.subjectCode].total = sessionsHeld || 0;
    })

    // Add attended counts from the 'attendance' collection (reading properly as requested)
    attendance.forEach(record => {
        const code = (record as any).subjectCode; // Use embedded subjectCode if present
        if (code) {
            if (!subjectStats[code]) {
                // If it's an ad-hoc session not in timetable, add it
                const sessHeld = sessions.filter((sess: any) =>
                    sess.subjectCode === code || sess.subjectName === (record as any).subjectName
                ).length;

                subjectStats[code] = {
                    subjectName: (record as any).subjectName || code,
                    subjectCode: code,
                    total: sessHeld || 0,
                    attended: 0
                }
            }
            if (record.status === "present" || record.status === "late") {
                subjectStats[code].attended++
            }
        } else {
            // Fallback to timetable join via slotId
            const entry = timetable.find(t => t.classSlotId === record.slotId)
            if (entry) {
                const entryCode = entry.subjectCode
                if (!subjectStats[entryCode]) {
                    const sessHeld = sessions.filter((sess: any) =>
                        sess.subjectCode === entryCode || sess.subjectName === entry.subjectName
                    ).length;

                    subjectStats[entryCode] = { subjectName: entry.subjectName, subjectCode: entryCode, total: sessHeld || 0, attended: 0 }
                }
                if (record.status === "present" || record.status === "late") {
                    subjectStats[entryCode].attended++
                }
            }
        }
    })

    const subjects = Object.values(subjectStats).map(s => ({
        ...s,
        percentage: s.total > 0 ? Math.round((s.attended / s.total) * 100) : 0
    }))

    // Daily Logs (Reading properly from embedded data)
    const dayWiseLogs = attendance.map((a: any) => {
        const entry = timetable.find(t => t.classSlotId === a.slotId)
        const slotConfig = collegeSlots.find(s => s.id === a.slotId);

        // Find session to get teacher arrival
        // Match by date and slotId (ignoring prefix 'slot-' if needed)
        const dateStr = new Date(a.timestamp).toLocaleDateString('en-CA');
        const session = sessions.find(s =>
            (s.slotId === a.slotId || `slot-${s.slotId}` === a.slotId) &&
            new Date(s.startTime).toLocaleDateString('en-CA') === dateStr
        );

        // Calculate late minutes relative to TEACHER arrival or SLT start
        let lateMins = 0;
        const baselineTime = session?.teacherArrivedAt || slotConfig?.startTime;

        if (a.status === "late" && baselineTime) {
            let start: Date;
            if (typeof baselineTime === 'string') {
                const [h, m] = baselineTime.split(':').map(Number);
                start = new Date(a.timestamp);
                start.setHours(h, m, 0, 0);
            } else {
                start = new Date(baselineTime);
            }
            lateMins = Math.max(0, Math.round((new Date(a.timestamp).getTime() - start.getTime()) / 60000));
        }

        return {
            id: a.id || a._id.toString(),
            date: a.timestamp,
            time: new Date(a.timestamp).toLocaleTimeString(),
            subject: a.subjectName || entry?.subjectName || a.subjectCode || "Unknown",
            status: a.status,
            points: a.pointsEarned,
            duration: slotConfig?.duration || 60,
            startTime: slotConfig?.startTime || "N/A",
            endTime: slotConfig?.endTime || "N/A",
            lateMins: lateMins > 0 ? lateMins : undefined,
            teacherArrivedAt: session?.teacherArrivedAt ? new Date(session.teacherArrivedAt).toLocaleTimeString() : undefined
        }
    })

    return {
        student: { id: student.id, name: student.name, email: student.email, classId: student.classId, reg: student.registerNumber },
        subjects,
        logs: dayWiseLogs
    }
}

// 4. Teacher Analytics
export async function getTeacherList(filters: { departmentId?: string, query?: string }) {
    const db = await getDB()
    const sessionOrgId = await getSessionOrganizationId()

    const query: any = { role: "teacher", organizationId: sessionOrgId }
    if (filters.departmentId && filters.departmentId !== "all") query.departmentId = filters.departmentId
    if (filters.query) {
        query.$or = [
            { name: { $regex: filters.query, $options: "i" } },
            { id: { $regex: filters.query, $options: "i" } }
        ]
    }

    const teachers = await db.collection("users").find(query).toArray()

    return teachers.map(t => ({
        id: t.id || t._id.toString(),
        name: t.name,
        email: t.email,
        departmentId: t.departmentId,
        department: t.department,
        avatar: t.avatar
    }))
}

export async function getTeacherAttendanceAnalytics(teacherId: string, filters?: { startDate?: Date, endDate?: Date }) {
    const db = await getDB()
    const sessionOrgId = await getSessionOrganizationId()

    // 1. Get Teacher
    const teacher = await db.collection("users").findOne({
        role: "teacher",
        $or: [{ id: teacherId }, { _id: (ObjectId.isValid(teacherId) ? new ObjectId(teacherId) : null) as any }],
        organizationId: sessionOrgId
    });

    if (!teacher) return null;

    // 2. Get Sessions
    const sessionQuery: any = {
        organizationId: sessionOrgId,
        $or: [{ teacherId: teacher.id }, { actualTeacherId: teacher.id }]
    };

    if (filters?.startDate || filters?.endDate) {
        sessionQuery.startTime = {};
        if (filters.startDate) sessionQuery.startTime.$gte = filters.startDate;
        if (filters.endDate) sessionQuery.startTime.$lte = filters.endDate;
    }

    const sessions = await db.collection("active_sessions").find(sessionQuery).sort({ startTime: -1 }).toArray();

    // 3. Aggregate Stats
    const totalSessions = sessions.length;
    const activeSessions = sessions.filter((s: any) => s.status === "ACTIVE" || s.status === "CLOSED").length;
    const missedSessions = sessions.filter((s: any) => s.status === "CANCELLED" || s.status === "WAITING_FOR_TEACHER").length;

    // Calculate Average Arrival Delay
    let totalDelayMins = 0;
    let sessionsWithDelay = 0;

    sessions.forEach((s: any) => {
        if (s.teacherArrivedAt && s.startTime) {
            const delay = (new Date(s.teacherArrivedAt).getTime() - new Date(s.startTime).getTime()) / 60000;
            if (delay > 0) {
                totalDelayMins += delay;
                sessionsWithDelay++;
            }
        }
    });

    const avgDelay = sessionsWithDelay > 0 ? Math.round(totalDelayMins / sessionsWithDelay) : 0;

    // 4. Session Logs with Student Attendance Counts
    const sessionLogs = await Promise.all(sessions.map(async (s: any) => {
        const studentCount = await db.collection("attendance").countDocuments({
            slotId: s.slotId,
            date: new Date(s.startTime).toLocaleDateString('en-CA')
        });

        return {
            id: s.sessionId,
            subject: s.subjectName,
            subjectCode: s.subjectCode,
            room: s.room,
            startTime: s.startTime,
            endTime: s.endTime,
            arrivedAt: s.teacherArrivedAt,
            status: s.status,
            studentCount,
            isOverride: s.isOverridden
        };
    }));

    return {
        teacher: {
            id: teacher.id,
            name: teacher.name,
            email: teacher.email,
            department: teacher.department
        },
        stats: {
            totalSessions,
            activeSessions,
            missedSessions,
            avgDelay,
            consistencyScore: totalSessions > 0 ? Math.round((activeSessions / totalSessions) * 100) : 0
        },
        logs: sessionLogs
    };
}
export async function getInRoomStatus(slotId: string, dateStr: string) {
    const db = await getDB()
    const sessionOrgId = await getSessionOrganizationId()

    const attendance = await db.collection("attendance").aggregate([
        { $match: { slotId, date: dateStr } },
        {
            $lookup: {
                from: "users",
                localField: "studentId",
                foreignField: "id",
                as: "student"
            }
        },
        { $unwind: "$student" },
        { $match: { "student.organizationId": sessionOrgId } },
        {
            $project: {
                studentName: "$student.name",
                studentId: "$studentId",
                status: "$status",
                inRoomStatus: { $ifNull: ["$inRoomStatus", "IN"] },
                lastMovementAt: { $ifNull: ["$lastMovementAt", "$timestamp"] }
            }
        },
        { $sort: { lastMovementAt: -1 } }
    ]).toArray()

    return attendance
}

export async function manualMarkAttendance(data: {
    studentId: string,
    slotId: string,
    status: "present" | "late"
}) {
    const db = await getDB()
    const orgId = await getSessionOrganizationId()
    const now = new Date()

    // Check if user exists
    const user = await db.collection<User>("users").findOne({ id: data.studentId, organizationId: orgId })
    if (!user) return { success: false, error: "Student not found." }

    // Check for duplicate for today/slot
    const startOfDay = new Date(now)
    startOfDay.setHours(0, 0, 0, 0)

    const existing = await db.collection("attendance").findOne({
        studentId: data.studentId,
        slotId: data.slotId,
        timestamp: { $gte: startOfDay }
    })

    if (existing) {
        return { success: false, error: "Attendance already marked for this slot." }
    }

    // Define points
    const points = data.status === "present" ? 10 : 5

    const record: AttendanceRecord = {
        id: crypto.randomUUID(),
        studentId: data.studentId,
        slotId: data.slotId,
        rfidTag: user.rfidTag || "MANUAL",
        timestamp: now,
        status: data.status,
        pointsEarned: points,
        organizationId: orgId
    }

    await db.collection("attendance").insertOne(record)

    // Update student points
    await db.collection("users").updateOne(
        { id: data.studentId },
        { $inc: { points: points } }
    )

    return { success: true, message: `Marked as ${data.status} manually.` }
}

export async function getDefaulterList(threshold = 75) {
    const db = await getDB()
    const orgId = await getSessionOrganizationId()

    // 1. Get all students
    const students = await db.collection("users").find({ role: "student", organizationId: orgId }).toArray()

    // 2. Aggregate attendance by student
    const stats = await db.collection("attendance").aggregate([
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
                studentId: "$_id",
                attendanceRate: { $multiply: [{ $divide: ["$present", "$total"] }, 100] },
                attended: "$present",
                totalClasses: "$total"
            }
        },
        { $match: { attendanceRate: { $lt: threshold } } }
    ]).toArray()

    // 3. Join with student data
    const defaulters = stats.map(stat => {
        const student = students.find(s => s.id === stat.studentId)
        return {
            ...stat,
            name: student?.name || "Unknown",
            email: student?.email,
            department: student?.department,
            registerNumber: student?.registerNumber
        }
    })

    return defaulters
}
