"use server"

import { getDB } from "@/lib/db"
import { Slot, User, Device } from "@/lib/types"
import { ObjectId } from "mongodb"

// --- DASHBOARD ANALYTICS ---

import { getSessionOrganizationId } from "@/lib/session"

export async function getDashboardStats(organizationId?: string) {
    const db = await getDB()
    const orgId = organizationId || await getSessionOrganizationId()

    // 1. Basic Counts (Scoped by Org)
    const studentsCount = await db.collection("users").countDocuments({ role: "student", organizationId })
    const teachersCount = await db.collection("users").countDocuments({ role: "teacher", organizationId })
    const slotsCount = await db.collection("college_slots").countDocuments({ isActive: true, organizationId })

    // 2. Attendance Chart Data (Last 7 Days) - Needs filtering by Student IDs in Org?
    // For performance, we assume attendance records also have 'organizationId' now.
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
    sevenDaysAgo.setHours(0, 0, 0, 0)

    const dailyAttendance = await db.collection("attendance").aggregate([
        { $match: { timestamp: { $gte: sevenDaysAgo }, organizationId } },
        {
            $group: {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
                count: { $sum: 1 }
            }
        },
        { $sort: { _id: 1 } }
    ]).toArray()

    // Fill missing days
    const chartData = []
    for (let i = 0; i < 7; i++) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        const dateStr = d.toISOString().split('T')[0]
        const dayName = d.toLocaleDateString('en-US', { weekday: 'short' })

        const found = dailyAttendance.find((x: any) => x._id === dateStr)
        chartData.unshift({
            name: dayName,
            total: found ? found.count : 0
        })
    }

    // 3. Recent Activity (Scoped)
    // Filter attendance by organizationId directly
    const recentLogs = await db.collection("attendance").aggregate([
        { $match: { organizationId } },
        { $sort: { timestamp: -1 } },
        { $limit: 5 },
        { $lookup: { from: "users", localField: "studentId", foreignField: "id", as: "user" } },
        { $unwind: "$user" }
    ]).toArray()

    const activities = recentLogs.map((log: any) => ({
        id: log._id.toString(),
        user: log.user.name,
        action: log.status === 'present' ? 'Checked In' : 'Marked Late',
        time: new Date(log.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        status: log.status === 'present' ? 'success' : 'warning',
        points: log.pointsEarned
    }))

    return {
        counts: {
            students: studentsCount,
            teachers: teachersCount,
            slots: slotsCount
        },
        chartData,
        activities
    }
}


// --- SYSTEM & SETTINGS ---

export interface TimeSlotConfig {
    id: number | string
    startTime: string // "09:00"
    endTime: string // "10:00"
    label?: string // "Period 1"
    type: "class" | "break"
}

const DEFAULT_TIME_SLOTS: TimeSlotConfig[] = [
    { id: 1, startTime: "09:00", endTime: "10:00", type: "class", label: "Period 1" },
    { id: 2, startTime: "10:00", endTime: "11:00", type: "class", label: "Period 2" },
    { id: 3, startTime: "11:00", endTime: "12:00", type: "class", label: "Period 3" },
    { id: 4, startTime: "12:00", endTime: "13:00", type: "class", label: "Period 4" },
    { id: "break", startTime: "13:00", endTime: "14:00", type: "break", label: "Lunch Break" },
    { id: 5, startTime: "14:00", endTime: "15:00", type: "class", label: "Period 5" },
    { id: 6, startTime: "15:00", endTime: "16:00", type: "class", label: "Period 6" },
    { id: 7, startTime: "16:00", endTime: "17:00", type: "class", label: "Period 7" },
]

export async function getTimeSlots(organizationId?: string): Promise<TimeSlotConfig[]> {
    const orgId = organizationId || await getSessionOrganizationId()
    const db = await getDB()
    const settings = await db.collection("system_settings").findOne({ type: "time_slots", organizationId: orgId })

    if (settings && settings.slots) {
        return settings.slots
    }

    return DEFAULT_TIME_SLOTS
}

export async function updateTimeSlots(newSlots: TimeSlotConfig[], organizationId?: string) {
    const orgId = organizationId || await getSessionOrganizationId()
    const db = await getDB()

    // 1. Fetch current settings to compare
    const currentSettings = await db.collection("system_settings").findOne({ type: "time_slots", organizationId: orgId })
    const oldSlots: TimeSlotConfig[] = currentSettings?.slots || []

    // 2. Identify Updates for Migration
    // We assume slots are stable by ID. 
    // If an ID exists in both, check if startTime/endTime changed.
    for (const newSlot of newSlots) {
        const oldSlot = oldSlots.find(s => s.id === newSlot.id)
        if (oldSlot) {
            if (oldSlot.startTime !== newSlot.startTime || oldSlot.endTime !== newSlot.endTime) {
                // Time changed! Migrate existing timetable entries.
                // We update matches on (oldStartTime, oldEndTime) to ensure precise migration
                // Or just by linking? Our slots don't have masterId link, so we must match by values.

                await db.collection("college_slots").updateMany(
                    {
                        organizationId,
                        // Match roughly by time logic or just blindly update all that match old slot profile?
                        // Ideally we'd have a link, but without it:
                        startTime: oldSlot.startTime,
                        // endTime: oldSlot.endTime // optional strictness
                    },
                    {
                        $set: {
                            startTime: newSlot.startTime,
                            endTime: newSlot.endTime
                        }
                    }
                )
                console.log(`Migrated slots from ${oldSlot.startTime} to ${newSlot.startTime}`)
            }
        }
    }

    // 3. Save New Settings
    await db.collection("system_settings").updateOne(
        { type: "time_slots", organizationId },
        { $set: { slots: newSlots, updatedAt: new Date(), organizationId } },
        { upsert: true }
    )
    return { success: true }
}


// --- TIMETABLE & HOLIDAYS ---

export interface Holiday {
    id: string
    name: string
    startDate: Date
    endDate: Date
    type: "holiday" | "event" | "exam"
    description?: string
    organizationId: string
}

export async function getHolidays(organizationId?: string): Promise<Holiday[]> {
    const orgId = organizationId || await getSessionOrganizationId()
    const db = await getDB()
    const holidays = await db.collection("holidays").find({ organizationId: orgId }).toArray()
    return holidays.map(h => ({
        ...h,
        id: h._id.toString(),
        startDate: new Date(h.startDate),
        endDate: new Date(h.endDate)
    })) as any[]
}

export async function addHoliday(data: { name: string, startDate: Date, endDate: Date, type: string, organizationId?: string }) {
    const db = await getDB()
    const holiday = {
        ...data,
        id: crypto.randomUUID(),
        organizationId: data.organizationId || await getSessionOrganizationId(),
        createdAt: new Date()
    }
    await db.collection("holidays").insertOne(holiday)
    return { success: true, holiday }
}

export async function deleteHoliday(id: string) {
    const db = await getDB()
    const { ObjectId } = require("mongodb")
    // Support UUID deletion primarily
    const res = await db.collection("holidays").deleteOne({ id })
    if (res.deletedCount === 0) {
        try {
            await db.collection("holidays").deleteOne({ _id: new ObjectId(id) })
        } catch (e) { }
    }
    return { success: true }
}

export async function getAllSlots(organizationId?: string): Promise<Slot[]> {
    // Legacy support
    const db = await getDB()
    const orgId = organizationId || await getSessionOrganizationId()
    const slots = await db.collection("college_slots").find({ organizationId: orgId }).toArray()
    return slots.map(slot => ({
        ...slot,
        id: slot.id || slot._id.toString()
    })) as any[]
}

export async function upsertSlot(slotData: Partial<Slot>) {
    const db = await getDB()
    const { id, _id, ...data } = slotData as any

    // If we have an ID, update. Else insert.
    if (id || _id) {
        let filter = id ? { id } : { _id: new ObjectId(_id) }
        await db.collection("college_slots").updateOne(filter, { $set: data }, { upsert: true })
    } else {
        await db.collection("college_slots").insertOne({
            ...data,
            id: crypto.randomUUID(), // Ensure UUID
            isActive: true, // Default
            createdAt: new Date()
        })
    }
    return { success: true }
}

export async function deleteSlot(slotId: string) {
    const db = await getDB()
    const { ObjectId } = require("mongodb")
    // Try both ID formats
    try {
        await db.collection("college_slots").deleteOne({ id: slotId })
    } catch (e) {
        await db.collection("college_slots").deleteOne({ _id: new ObjectId(slotId) })
    }
    return { success: true }
}


// --- TEACHERS ---

export async function getTeachers(organizationId?: string): Promise<User[]> {
    const db = await getDB()
    const orgId = organizationId || await getSessionOrganizationId()
    const teachers = await db.collection<User>("users").find({ role: "teacher", organizationId: orgId }).toArray()

    return teachers.map(t => ({
        ...t,
        id: t.id || t._id.toString(),
        _id: t._id.toString()
    })) as any[]
}

export async function getTeacherProfile(teacherId: string) {
    const db = await getDB()
    let teacher = await db.collection("users").findOne({ id: teacherId })
    if (!teacher) {
        try { teacher = await db.collection("users").findOne({ _id: new ObjectId(teacherId) }) } catch (e) { }
    }
    if (!teacher) return null

    const classes = await db.collection("college_slots").find({ teacherId: teacher.id }).toArray()
    const mentorship = (teacher as any).classTeacherOf ? [(teacher as any).classTeacherOf] : []

    return {
        teacher: { ...teacher, id: teacher.id || teacher._id.toString(), _id: teacher._id.toString() } as unknown as User,
        classes: classes.map(c => ({ ...c, id: c._id.toString(), _id: c._id.toString() })) as unknown as Slot[],
        mentorship
    }
}

export async function addTeacher(data: Partial<User>) {
    const db = await getDB()
    const existing = await db.collection("users").findOne({ email: data.email })
    if (existing) return { success: false, message: "Email already exists" }

    const newTeacher = {
        ...data,
        id: crypto.randomUUID(),
        role: "teacher" as const,
        createdAt: new Date(),
        points: 0,
        attendanceHistory: [],
        organizationId: data.organizationId || await getSessionOrganizationId()
    }
    await db.collection("users").insertOne(newTeacher)
    return { success: true, teacher: newTeacher }
}

// --- STUDENTS ---

export async function getStudents(organizationId?: string): Promise<User[]> {
    const db = await getDB()
    const orgId = organizationId || await getSessionOrganizationId()

    // Join with classes and departments to get names
    const students = await db.collection<User>("users").aggregate([
        { $match: { role: "student", organizationId: orgId } },
        {
            $lookup: {
                from: "classes",
                localField: "classId",
                foreignField: "id",
                as: "classInfo"
            }
        },
        {
            $lookup: {
                from: "departments",
                localField: "departmentId",
                foreignField: "id",
                as: "deptInfo"
            }
        },
        // Unwind to get single objects (preserveNullAndEmptyArrays in case of bad data)
        { $unwind: { path: "$classInfo", preserveNullAndEmptyArrays: true } },
        { $unwind: { path: "$deptInfo", preserveNullAndEmptyArrays: true } },

        // Project desired fields
        {
            $project: {
                id: 1, _id: 1, name: 1, email: 1, role: 1,
                rfidTag: 1, points: 1, organizationId: 1, createdAt: 1,
                gender: 1, dateOfBirth: 1,

                // Map the names
                className: "$classInfo.name",
                departmentName: "$deptInfo.name",
                departmentCode: "$deptInfo.code",

                // Keep original IDs
                classId: 1, departmentId: 1
            }
        }
    ]).toArray()

    return students.map(s => ({
        ...s,
        id: s.id || s._id.toString(),
        _id: s._id.toString(),

        // Polyfill legacy fields for frontend compatibility if needed
        department: s.departmentName || s.departmentCode || "Unknown",
        // year/semester might be missing if we strictly use IDs now
    })) as any[]
}

export async function addStudent(data: Partial<User>) {
    const db = await getDB()
    const orgId = data.organizationId || await getSessionOrganizationId()

    if (!data.name || !data.email) {
        return { success: false, message: "Name and Email are required" }
    }

    const existing = await db.collection("users").findOne({ email: data.email, organizationId: orgId })
    if (existing) return { success: false, message: "Email already exists in this organization" }

    const newStudent = {
        ...data,
        id: crypto.randomUUID(),
        role: "student" as const,
        createdAt: new Date(),
        points: 0,
        attendanceHistory: [],
        organizationId: orgId,
        password: data.password || "student123", // Default if not provided, but UI should enforce it
    }
    await db.collection("users").insertOne(newStudent)
    return { success: true, student: newStudent }
}

export async function updateStudent(studentId: string, data: any) {
    const db = await getDB()
    const { ObjectId } = require("mongodb")

    // Build update object
    const updateData: any = {
        name: data.name,
        email: data.email,
        updatedAt: new Date()
    }

    // Optional fields
    if (data.registerNumber) updateData.registerNumber = data.registerNumber
    if (data.rfidTag) updateData.rfidTag = data.rfidTag
    if (data.gender) updateData.gender = data.gender
    if (data.dateOfBirth) updateData.dateOfBirth = data.dateOfBirth
    if (data.bloodGroup) updateData.bloodGroup = data.bloodGroup
    if (data.phoneNumber) updateData.phoneNumber = data.phoneNumber
    if (data.parent) updateData.parent = data.parent
    if (data.address) updateData.address = data.address

    // Try updating by id first, then by _id
    let result = await db.collection("users").updateOne(
        { id: studentId, role: "student" },
        { $set: updateData }
    )

    if (result.matchedCount === 0) {
        try {
            result = await db.collection("users").updateOne(
                { _id: new ObjectId(studentId), role: "student" },
                { $set: updateData }
            )
        } catch (e) {
            return { success: false, message: "Student not found" }
        }
    }

    if (result.matchedCount === 0) {
        return { success: false, message: "Student not found" }
    }

    return { success: true, message: "Student updated successfully" }
}


export async function resetStudentPassword(studentId: string, newPassword?: string) {
    const db = await getDB()
    const { ObjectId } = require("mongodb")
    // If no password provided, generate a default one? Or require it.
    if (!newPassword) return { success: false, message: "New password required" }

    let result = await db.collection("users").updateOne(
        { id: studentId, role: "student" },
        { $set: { password: newPassword } }
    )

    if (result.matchedCount === 0) {
        try {
            result = await db.collection("users").updateOne(
                { _id: new ObjectId(studentId), role: "student" },
                { $set: { password: newPassword } }
            )
        } catch (e) {
            return { success: false, message: "Student not found" }
        }
    }

    if (result.matchedCount === 0) {
        return { success: false, message: "Student not found" }
    }

    return { success: true, message: "Password reset successfully" }
}

// --- DEVICES ---

export async function getDevices(organizationId?: string): Promise<Device[]> {
    const db = await getDB()
    const orgId = organizationId || await getSessionOrganizationId()
    const devices = await db.collection<Device>("devices").find({ organizationId: orgId }).toArray()
    return devices.map(d => ({ ...d, id: d.id || d._id.toString(), _id: d._id.toString() })) as any[]
}

export async function toggleDeviceStatus(deviceId: string, status: "online" | "offline" | "maintenance") {
    const db = await getDB()
    const { ObjectId } = require("mongodb")
    // Use new ID primarily
    let res = await db.collection("devices").updateOne({ id: deviceId }, { $set: { status, lastPing: new Date() } })
    if (res.matchedCount === 0) {
        try { await db.collection("devices").updateOne({ _id: new ObjectId(deviceId) }, { $set: { status, lastPing: new Date() } }) } catch (e) { }
    }
    return { success: true }
}


export async function deleteUser(userId: string) {
    const db = await getDB()
    const { ObjectId } = require("mongodb")

    // 1. Delete Attendance Records
    await db.collection("attendance").deleteMany({ studentId: userId })

    // 2. Delete User
    // Try both ID formats
    let result = await db.collection("users").deleteOne({ id: userId });
    if (result.deletedCount === 0) {
        try { result = await db.collection("users").deleteOne({ _id: new ObjectId(userId) }); } catch (e) { }
    }

    return { success: true }
}
