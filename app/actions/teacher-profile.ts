"use server"

import { getDB } from "@/lib/db"
import { User } from "@/lib/types"
import { ObjectId } from "mongodb"
import { getSessionOrganizationId } from "@/lib/session"

// Get teacher by ID with full details
export async function getTeacherById(id: string): Promise<User | null> {
    const db = await getDB()
    const orgId = await getSessionOrganizationId()

    let teacher = await db.collection("users").findOne({ id, role: "teacher", organizationId: orgId })
    if (!teacher) {
        try {
            teacher = await db.collection("users").findOne({ _id: new ObjectId(id), role: "teacher", organizationId: orgId })
        } catch (e) {
            return null
        }
    }

    if (!teacher) return null

    return {
        id: teacher.id || teacher._id.toString(),
        name: teacher.name || "",
        email: teacher.email || "",
        role: teacher.role || "teacher",
        department: teacher.department,
        organizationId: teacher.organizationId || "",
        points: teacher.points || 0,
        phoneNumber: teacher.phoneNumber,
        address: teacher.address,
        aadharNumber: teacher.aadharNumber,
        employeeId: teacher.employeeId,
        rfidTag: teacher.rfidTag,
        qualification: teacher.qualification,
        gender: teacher.gender,
        dateOfBirth: teacher.dateOfBirth ? new Date(teacher.dateOfBirth) : undefined,
        emergencyContact: teacher.emergencyContact,
        bloodGroup: teacher.bloodGroup,
        dateOfJoining: teacher.dateOfJoining ? new Date(teacher.dateOfJoining) : undefined,
        createdAt: teacher.createdAt ? new Date(teacher.createdAt) : new Date()
    } as User
}

// Get subjects taught by teacher
export async function getTeacherSubjects(teacherId: string) {
    const db = await getDB()

    const mappings = await db.collection("teacher_subject_mappings")
        .find({ teacherId })
        .toArray()

    const subjectIds = mappings.map(m => m.subjectId)
    const subjects = await db.collection("subjects")
        .find({ id: { $in: subjectIds } })
        .toArray()

    return mappings.map(mapping => {
        const subject = subjects.find(s => s.id === mapping.subjectId)
        return {
            subjectId: mapping.subjectId,
            subjectName: subject?.name || "Unknown",
            subjectCode: subject?.code || "",
            departmentCode: mapping.departmentCode,
            semester: mapping.semester
        }
    })
}

// Get teacher's timetable
export async function getTeacherTimetable(teacherId: string) {
    const db = await getDB()

    const slots = await db.collection("slots")
        .find({ teacherId, isActive: true })
        .sort({ day: 1, startTime: 1 })
        .toArray()

    return slots.map(s => ({
        id: s.id || s._id.toString(),
        courseName: s.courseName || "",
        courseCode: s.courseCode || "",
        day: s.day || "",
        startTime: s.startTime || "",
        endTime: s.endTime || "",
        room: s.room || "",
        department: s.department || "",
        year: s.year || 1,
        semester: s.semester || 1
    }))
}
