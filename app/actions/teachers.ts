"use server"

import { getDB } from "@/lib/db"
import { Slot, User } from "@/lib/types"

/* =========================================================
   TEACHER DTO & INTERFACES
========================================================= */
export interface TeacherDTO {
    id: string
    name: string
    email: string
    phoneNumber?: string
    employeeId?: string
    qualification?: string
    department: string
    teachingDepartments: string[]
    rfidTag?: string
    classTutorId?: string
    organizationId: string
    departmentId?: string
    role: "teacher"
    points: number
    createdAt: Date
    gender?: "male" | "female" | "other" | "Male" | "Female"
}

/* =========================================================
   GET ALL TEACHERS
========================================================= */
import { getSessionOrganizationId } from "@/lib/session"

/* =========================================================
   GET ALL TEACHERS
========================================================= */
export async function getTeachers(
    departmentCode?: string,
    organizationId?: string
): Promise<TeacherDTO[]> {
    const db = await getDB()
    const orgId = organizationId || await getSessionOrganizationId()

    const filter: any = { role: "teacher", organizationId: orgId }

    if (departmentCode) {
        filter.$or = [
            { teachingDepartments: departmentCode }, // Direct ID match
            { department: departmentCode }, // Direct code match (Legacy)
            { departmentId: departmentCode } // Direct ID match on primary dept
        ]
    }

    const teachers = await db
        .collection("users")
        .find(filter)
        .sort({ name: 1 })
        .toArray()

    return teachers.map((t: any) => ({
        id: t.id || t._id.toString(),
        name: t.name || "Unknown",
        email: t.email || "",
        phoneNumber: t.phoneNumber || "",
        employeeId: t.employeeId || "",
        qualification: t.qualification || "",
        department: t.department || "Unknown", // Standard property name
        teachingDepartments: Array.isArray(t.teachingDepartments)
            ? t.teachingDepartments
            : [t.department].filter(Boolean),
        rfidTag: t.rfidTag,
        classTutorId: t.classTutorId,
        organizationId: t.organizationId || "org-1",
        departmentId: t.departmentId, // Expose UUID
        role: "teacher",
        points: t.points || 0,
        createdAt: t.createdAt ? new Date(t.createdAt) : new Date(),
        gender: t.gender as any // Safe cast for now, assuming DB has correct values
    }))
}

/* =========================================================
   GET DEPARTMENT TIMETABLE
========================================================= */
export async function getDepartmentTimetable(
    departmentId: string,
    organizationId?: string
): Promise<Slot[]> {
    const db = await getDB()
    const orgId = organizationId || await getSessionOrganizationId()

    const slots = await db
        .collection("college_slots")
        .find({
            $or: [{ departmentId: departmentId }, { department: departmentId }, { departmentCode: departmentId }],
            isActive: true,
            organizationId: orgId
        })
        .sort({ day: 1, startTime: 1 })
        .toArray()

    return slots.map((s: any) => ({
        id: s.id || s._id.toString(),
        name: s.name || "",
        courseCode: s.courseCode || "",
        courseName: s.courseName || "",
        teacherId: s.teacherId || "",
        actualTeacherId: s.actualTeacherId,
        currentTeacherId: s.currentTeacherId,
        currentSubject: s.currentSubject,
        classId: s.classId,
        day: s.day || "",
        startTime: s.startTime || "",
        endTime: s.endTime || "",
        room: s.room || "",
        departmentId: s.departmentId,
        department: s.department || "",
        organizationId: s.organizationId,
        year: s.year || 1,
        semester: s.semester || 1,
        isLastSlot: s.isLastSlot || false,
        isActive: s.isActive !== false,
        status: s.status || "Scheduled"
    }))
}

/* =========================================================
   CREATE TEACHER
========================================================= */
export async function createTeacher(data: {
    name: string
    email: string
    department: string // This is likely deptId now
    teachingDepartments?: string[]
    phoneNumber?: string
    employeeId?: string
    qualification?: string
    organizationId?: string
    rfidTag?: string
}) {
    const db = await getDB()
    const orgId = data.organizationId || await getSessionOrganizationId()

    const exists = await db
        .collection("users")
        .findOne({ email: data.email, organizationId: orgId })

    if (exists) {
        throw new Error("Email already exists")
    }

    const newTeacher: User = {
        id: crypto.randomUUID(),
        name: data.name,
        email: data.email,
        phoneNumber: data.phoneNumber,
        employeeId: data.employeeId,
        qualification: data.qualification,
        role: "teacher",
        departmentId: data.department, // Primary Dept ID
        department: "TBD", // Legacy field
        teachingDepartments: data.teachingDepartments ?? [data.department], // Array of IDs
        organizationId: orgId,
        rfidTag: data.rfidTag,
        points: 0,
        createdAt: new Date()
    }

    await db.collection("users").insertOne(newTeacher)
    return { success: true, teacher: newTeacher }
}

/* =========================================================
   UPDATE TEACHER
========================================================= */
export async function updateTeacher(
    id: string,
    data: Partial<{
        name: string
        email: string
        department: string
        teachingDepartments: string[]
        rfidTag?: string
        phoneNumber?: string
        employeeId?: string
        qualification?: string
    }>
) {
    const db = await getDB()

    const updateData: any = {
        ...data,
        updatedAt: new Date()
    }

    // Legacy mapping if needed
    if (updateData.department) updateData.departmentId = updateData.department;

    if (
        updateData.teachingDepartments &&
        updateData.teachingDepartments.length === 0
    ) {
        delete updateData.teachingDepartments
    }

    const result = await db.collection("users").updateOne(
        { id: id },
        { $set: updateData }
    )

    if (result.matchedCount === 0) {
        throw new Error("Teacher not found")
    }

    return { success: true }
}

/* =========================================================
   DELETE TEACHER
========================================================= */
export async function deleteTeacher(id: string) {
    const db = await getDB()

    const activeSlots = await db.collection("college_slots").countDocuments({ teacherId: id })

    if (activeSlots > 0) {
        throw new Error(`Cannot delete: Teacher assigned to ${activeSlots} slots.`)
    }

    const result = await db.collection("users").deleteOne({ id: id })

    if (result.deletedCount === 0) {
        throw new Error("Teacher not found")
    }

    return { success: true }
}

/* =========================================================
   CREATE SLOT
   (Now scoped by Org)
========================================================= */
export async function createSlot(data: {
    courseName: string
    courseCode: string
    teacherId: string
    classId?: string
    day: string
    startTime: string
    endTime: string
    room?: string
    departmentId?: string
    department?: string // Legacy
    semester?: number
    year?: number
    organizationId?: string
}) {
    const db = await getDB()
    const orgId = data.organizationId || await getSessionOrganizationId()

    const newSlot: Slot = {
        id: crypto.randomUUID(),
        name: `${data.courseName} - ${data.day}`,
        courseCode: data.courseCode,
        courseName: data.courseName,
        teacherId: data.teacherId,
        classId: data.classId,
        day: data.day,
        startTime: data.startTime,
        endTime: data.endTime,
        room: data.room || "",
        departmentId: data.departmentId,
        department: data.department || "", // Legacy
        year: data.year || 0,
        semester: data.semester || 0,
        organizationId: orgId,
        isLastSlot: false,
        isActive: true, // Default
        status: "Scheduled"
    }

    await db.collection("college_slots").insertOne(newSlot)
    return { success: true, slot: newSlot }
}

/* =========================================================
   UPDATE & DELETE SLOT (Preserved)
========================================================= */
export async function updateSlot(
    id: string,
    data: Partial<Omit<Slot, "id">>
) {
    const db = await getDB()
    const result = await db.collection("college_slots").updateOne(
        { id },
        { $set: { ...data, updatedAt: new Date() } }
    )
    if (result.matchedCount === 0) return { success: false, error: "Slot not found" }
    return { success: true }
}

export async function deleteSlot(id: string) {
    const db = await getDB()
    const attendanceCount = await db.collection("attendance").countDocuments({ slotId: id })
    if (attendanceCount > 0) return { success: false, error: "Cannot delete slot with attendance records" }
    const result = await db.collection("college_slots").deleteOne({ id })
    if (result.deletedCount === 0) return { success: false, error: "Slot not found" }
    return { success: true }
}