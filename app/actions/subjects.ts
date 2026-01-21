"use server"

import { getDB } from "@/lib/db"
import { Subject, SubjectDepartmentMapping, TeacherSubjectMapping } from "@/lib/types"
import { ObjectId } from "mongodb"

import { getSessionOrganizationId } from "@/lib/session"

// ===============================
// SUBJECT CRUD OPERATIONS
// ===============================

export async function getSubjects(organizationId?: string) {
    const db = await getDB()
    const orgId = organizationId || await getSessionOrganizationId()
    const subjects = await db.collection("subjects").find({ organizationId: orgId }).sort({ name: 1 }).toArray()

    return subjects.map(s => ({
        id: s.id || s._id.toString(),
        name: s.name || "",
        code: s.code || "",
        description: s.description,
        credits: s.credits || 0,
        type: s.type || "common",
        createdAt: s.createdAt ? new Date(s.createdAt) : new Date()
    })) as Subject[]
}

export async function getSubjectById(id: string) {
    const db = await getDB()
    const subject = await db.collection("subjects").findOne({ id })

    if (!subject) return null

    // Get all departments offering this subject
    const deptMappings = await db.collection("subject_department_mappings")
        .find({ subjectId: id })
        .toArray()

    // Get all teachers teaching this subject
    const teacherMappings = await db.collection("teacher_subject_mappings")
        .find({ subjectId: id })
        .toArray()

    return {
        ...subject,
        id: subject.id || subject._id.toString(),
        departments: deptMappings.map(d => ({
            ...d,
            id: d.id || d._id.toString()
        })),
        teachers: teacherMappings.map(t => ({
            ...t,
            id: t.id || t._id.toString()
        }))
    }
}

export async function createSubject(data: {
    name: string
    code: string
    description?: string
    credits: number
    type: "common" | "unique"
    organizationId?: string
}) {
    const db = await getDB()
    const orgId = data.organizationId || await getSessionOrganizationId()

    const subject: Subject = {
        id: crypto.randomUUID(),
        ...data,
        organizationId: orgId,
        createdAt: new Date()
    }

    await db.collection("subjects").insertOne(subject)
    return { success: true, subject }
}

export async function updateSubject(id: string, data: Partial<Subject>) {
    const db = await getDB()
    const { createdAt, id: _, ...updateData } = data as any

    await db.collection("subjects").updateOne(
        { id },
        { $set: { ...updateData, updatedAt: new Date() } }
    )

    return { success: true }
}

export async function deleteSubject(id: string) {
    const db = await getDB()

    // Remove all mappings first
    await db.collection("subject_department_mappings").deleteMany({ subjectId: id })
    await db.collection("teacher_subject_mappings").deleteMany({ subjectId: id })

    // Then delete subject
    await db.collection("subjects").deleteOne({ id })

    return { success: true }
}

// ===============================
// SUBJECT-DEPARTMENT MAPPING
// ===============================

export async function assignSubjectToDepartment(params: {
    subjectId: string
    departmentCode: string
    semester: number
    isElective: boolean
    organizationId?: string
}) {
    const db = await getDB()
    const orgId = params.organizationId || await getSessionOrganizationId()

    // Check if mapping already exists
    const existing = await db.collection("subject_department_mappings").findOne({
        subjectId: params.subjectId,
        departmentCode: params.departmentCode,
        semester: params.semester
    })

    if (existing) {
        return { success: false, error: "Subject already assigned to this department and semester" }
    }

    const mapping: SubjectDepartmentMapping = {
        id: crypto.randomUUID(),
        ...params,
        createdAt: new Date()
    }

    await db.collection("subject_department_mappings").insertOne(mapping)
    return { success: true, mapping }
}

export async function removeSubjectFromDepartment(subjectId: string, departmentCode: string, semester: number) {
    const db = await getDB()

    // Also remove teacher assignments for this context
    await db.collection("teacher_subject_mappings").deleteMany({
        subjectId,
        departmentCode,
        semester
    })

    await db.collection("subject_department_mappings").deleteOne({
        subjectId,
        departmentCode,
        semester
    })

    return { success: true }
}

export async function getSubjectsByDepartment(departmentCode: string, semester?: number) {
    const db = await getDB()

    const matchStage: any = { departmentCode }
    if (semester) matchStage.semester = semester

    const mappings = await db.collection("subject_department_mappings")
        .find(matchStage)
        .toArray()

    const subjectIds = mappings.map(m => m.subjectId)
    const subjects = await db.collection("subjects")
        .find({ id: { $in: subjectIds } })
        .toArray()

    // Combine subject data with mapping data
    return subjects.map(s => {
        const mapping = mappings.find(m => m.subjectId === s.id)
        return {
            ...s,
            id: s.id || s._id.toString(),
            semester: mapping?.semester,
            isElective: mapping?.isElective
        }
    })
}

// ===============================
// TEACHER-SUBJECT MAPPING
// ===============================

export async function assignTeacherToSubject(params: {
    teacherId: string
    subjectId: string
    departmentCode: string
    semester: number
    organizationId?: string
}) {
    const db = await getDB()
    const orgId = params.organizationId || await getSessionOrganizationId()

    // Check if mapping already exists
    const existing = await db.collection("teacher_subject_mappings").findOne({
        teacherId: params.teacherId,
        subjectId: params.subjectId,
        departmentCode: params.departmentCode,
        semester: params.semester
    })

    if (existing) {
        return { success: false, error: "Teacher already assigned to this subject" }
    }

    const mapping: TeacherSubjectMapping = {
        id: crypto.randomUUID(),
        ...params,
        assignedAt: new Date()
    }

    await db.collection("teacher_subject_mappings").insertOne(mapping)
    return { success: true, mapping }
}

export async function removeTeacherFromSubject(teacherId: string, subjectId: string, departmentCode: string) {
    const db = await getDB()

    await db.collection("teacher_subject_mappings").deleteOne({
        teacherId,
        subjectId,
        departmentCode
    })

    return { success: true }
}

export async function getTeacherSubjects(teacherId: string) {
    const db = await getDB()

    const mappings = await db.collection("teacher_subject_mappings")
        .find({ teacherId })
        .toArray()

    const subjectIds = mappings.map(m => m.subjectId)
    const subjects = await db.collection("subjects")
        .find({ id: { $in: subjectIds } })
        .toArray()

    // Combine with department context
    return mappings.map(m => {
        const subject = subjects.find(s => s.id === m.subjectId)
        return {
            ...subject,
            id: subject?.id || subject?._id?.toString(),
            departmentCode: m.departmentCode,
            semester: m.semester,
            assignedAt: m.assignedAt
        }
    })
}

export async function getSubjectTeachers(subjectId: string, departmentCode?: string) {
    const db = await getDB()

    const matchStage: any = { subjectId }
    if (departmentCode) matchStage.departmentCode = departmentCode

    const mappings = await db.collection("teacher_subject_mappings")
        .find(matchStage)
        .toArray()

    const teacherIds = mappings.map(m => m.teacherId)
    const teachers = await db.collection("users")
        .find({ id: { $in: teacherIds }, role: "teacher" })
        .toArray()

    return teachers.map(t => {
        const mapping = mappings.find(m => m.teacherId === t.id)
        return {
            id: t.id || t._id.toString(),
            name: t.name,
            email: t.email,
            department: t.department,
            teachingDepartment: mapping?.departmentCode,
            semester: mapping?.semester
        }
    })
}
