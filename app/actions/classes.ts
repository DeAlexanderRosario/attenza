"use server"

import { getDB } from "@/lib/db"
import { Class, ClassStats } from "@/lib/types"

import { getSessionOrganizationId } from "@/lib/session"

// Get all classes (filtered by organization and optionally department)
export async function getClasses(departmentId?: string, organizationId?: string): Promise<Class[]> {
    const db = await getDB()
    const orgId = organizationId || await getSessionOrganizationId()

    const filter: any = { organizationId: orgId }
    if (departmentId) {
        filter.departmentId = departmentId
    }

    const classes = await db.collection("classes")
        .find(filter)
        .sort({ departmentCode: 1, year: 1, section: 1 })
        .toArray()

    return classes.map(c => ({
        id: c.id || c._id.toString(),
        name: c.name || "",
        departmentId: c.departmentId,
        departmentCode: c.departmentCode || "",
        year: c.year || 1,
        section: c.section,
        classTutorId: c.classTutorId,
        roomNumber: c.roomNumber,
        location: c.location,
        organizationId: c.organizationId,
        capacity: c.capacity || 60,
        createdAt: c.createdAt ? new Date(c.createdAt) : new Date()
    })) as Class[]
}

// Get class by ID
export async function getClassById(id: string): Promise<Class | null> {
    const db = await getDB()
    const classDoc = await db.collection("classes").findOne({ id })

    if (!classDoc) return null

    return {
        id: classDoc.id || classDoc._id.toString(),
        name: classDoc.name || "",
        departmentId: classDoc.departmentId,
        departmentCode: classDoc.departmentCode || "",
        year: classDoc.year || 1,
        section: classDoc.section,
        classTutorId: classDoc.classTutorId,
        roomNumber: classDoc.roomNumber,
        location: classDoc.location,
        organizationId: classDoc.organizationId,
        capacity: classDoc.capacity || 60,
        createdAt: classDoc.createdAt ? new Date(classDoc.createdAt) : new Date()
    } as Class
}

// Create new class
export async function createClass(data: {
    name: string
    departmentId: string
    departmentCode: string // Legacy or Convenience
    year: number
    section?: string
    capacity?: number
    organizationId?: string
}) {
    const db = await getDB()
    const orgId = data.organizationId || await getSessionOrganizationId()

    const newClass: Class = {
        id: crypto.randomUUID(),
        name: data.name,
        departmentId: data.departmentId,
        departmentCode: data.departmentCode,
        year: data.year,
        section: data.section,
        capacity: data.capacity || 60,
        organizationId: orgId,
        createdAt: new Date()
    }

    await db.collection("classes").insertOne(newClass)
    return { success: true, class: newClass }
}

// Update class
export async function updateClass(id: string, data: Partial<Class>) {
    const db = await getDB()
    const { createdAt, id: _, ...updateData } = data as any

    await db.collection("classes").updateOne(
        { id },
        { $set: { ...updateData, updatedAt: new Date() } }
    )

    return { success: true }
}

// Delete class
export async function deleteClass(id: string) {
    const db = await getDB()

    // Check if class has students
    const studentsCount = await db.collection("users").countDocuments({
        classId: id,
        role: "student"
    })

    if (studentsCount > 0) {
        return {
            success: false,
            error: `Cannot delete class with ${studentsCount} students. Please reassign students first.`
        }
    }

    await db.collection("classes").deleteOne({ id })
    return { success: true }
}

// Assign Tutor
export async function assignClassTutor(classId: string, teacherId: string) {
    const db = await getDB()

    // Validate teacher exists
    const teacher = await db.collection("users").findOne({ id: teacherId, role: "teacher" })
    if (!teacher) throw new Error("Teacher not found")

    await db.collection("classes").updateOne(
        { id: classId },
        { $set: { classTutorId: teacherId, updatedAt: new Date() } }
    )

    // Optionally update teacher record to link back
    await db.collection("users").updateOne(
        { id: teacherId },
        { $set: { classTeacherOf: classId } }
    )

    return { success: true }
}

// Allocate Room
export async function allocateRoom(classId: string, roomNumber: string) {
    const db = await getDB()

    await db.collection("classes").updateOne(
        { id: classId },
        { $set: { roomNumber: roomNumber, updatedAt: new Date() } }
    )

    return { success: true }
}

// Get class statistics
export async function getClassStats(classId: string): Promise<ClassStats | null> {
    const db = await getDB()

    const classDoc = await getClassById(classId)
    if (!classDoc) return null

    // Get students in this class
    const students = await db.collection("users")
        .find({ classId, role: "student" })
        .toArray()

    const totalStudents = students.length
    const maleStudents = students.filter(s => s.gender?.toLowerCase() === "male").length
    const femaleStudents = students.filter(s => s.gender?.toLowerCase() === "female").length

    // Calculate attendance rate
    const studentIds = students.map(s => s.id)
    const totalRecords = await db.collection("attendance").countDocuments({
        studentId: { $in: studentIds }
    })
    const presentRecords = await db.collection("attendance").countDocuments({
        studentId: { $in: studentIds },
        status: { $in: ["present", "late"] }
    })

    const attendanceRate = totalRecords > 0
        ? Math.round((presentRecords / totalRecords) * 100)
        : 0

    // Count defaulters (<75% attendance)
    // Placeholder - would need aggregation per student
    const defaulters = 0

    return {
        totalStudents,
        maleStudents,
        femaleStudents,
        attendanceRate,
        defaulters
    }
}
