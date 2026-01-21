"use server"

import { getDB } from "@/lib/db"
import { Department } from "@/lib/types"
import { ObjectId } from "mongodb"

import { getSessionOrganizationId } from "@/lib/session"

export async function getDepartments(organizationId?: string): Promise<Department[]> {
    const db = await getDB()
    const orgId = organizationId || await getSessionOrganizationId()
    const depts = await db.collection("departments").find({ organizationId: orgId }).toArray()
    return depts.map(d => ({
        id: d.id || d._id.toString(),
        name: d.name || "",
        code: d.code || "",
        hodId: d.hodId,
        description: d.description,
        organizationId: d.organizationId,
        createdAt: d.createdAt ? new Date(d.createdAt) : new Date()
    })) as Department[]
}

export async function getDepartmentById(id: string): Promise<Department | null> {
    const db = await getDB()
    let dept = await db.collection("departments").findOne({ id })
    if (!dept) {
        try { dept = await db.collection("departments").findOne({ _id: new ObjectId(id) }) } catch (e) { }
    }

    if (!dept) return null;

    return {
        id: dept.id || dept._id.toString(),
        name: dept.name || "",
        code: dept.code || "",
        hodId: dept.hodId,
        description: dept.description,
        organizationId: dept.organizationId,
        createdAt: dept.createdAt ? new Date(dept.createdAt) : new Date()
    } as Department
}

export async function createDepartment(data: { name: string, code: string, description?: string, organizationId?: string }) {
    const db = await getDB()
    const orgId = data.organizationId || await getSessionOrganizationId()

    const existing = await db.collection("departments").findOne({ code: data.code, organizationId: orgId })
    if (existing) return { success: false, message: "Department code already exists in this organization", department: null }

    const newDept: Department = {
        id: crypto.randomUUID(),
        name: data.name,
        code: data.code,
        description: data.description,
        organizationId: orgId,
        createdAt: new Date()
    }

    await db.collection("departments").insertOne(newDept)
    return { success: true, department: newDept }
}

export async function deleteDepartment(id: string) {
    const db = await getDB()

    // CASCADING DELETE LOGIC
    // 1. Delete associated Classes
    await db.collection("classes").deleteMany({ departmentId: id })

    // 2. Delete associated Slots
    await db.collection("college_slots").deleteMany({ departmentId: id })

    // 3. Delete associated Timetable Entries (if any legacy ones exist)
    await db.collection("timetable_entries").deleteMany({ departmentId: id })

    // 4. Delete Students in this Department
    // We should also delete their attendance records first
    const students = await db.collection("users").find({ departmentId: id, role: "student" }).toArray()
    const studentIds = students.map(s => s.id)
    if (studentIds.length > 0) {
        await db.collection("attendance").deleteMany({ studentId: { $in: studentIds } })
        await db.collection("users").deleteMany({ departmentId: id, role: "student" })
    }

    // 5. Delete Teachers belonging to this Department (Primary)
    // Teachers might be mapped to other depts, but if their home dept is gone, we delete them or unassign
    // Per user "delete fully", we delete them.
    await db.collection("users").deleteMany({ departmentId: id, role: "teacher" })

    // 6. Delete Mappings
    await db.collection("subject_department_mappings").deleteMany({ departmentId: id })

    // 7. Finally, Delete the Department
    let result = await db.collection("departments").deleteOne({ id })
    if (result.deletedCount === 0) {
        try { result = await db.collection("departments").deleteOne({ _id: new ObjectId(id) }) } catch (e) { }
    }

    if (result.deletedCount === 0) return { success: false, error: "Department not found" }

    return { success: true }
}

export async function getDepartmentStats(deptId: string) {
    const db = await getDB()
    const dept = await getDepartmentById(deptId)
    if (!dept) return null

    // Users in this department (using ID reference)
    const totalStaff = await db.collection("users").countDocuments({
        $or: [{ departmentId: dept.id }, { teachingDepartments: dept.id }],
        role: "teacher"
    })

    // For students, strictly use departmentId
    const totalStudents = await db.collection("users").countDocuments({ departmentId: dept.id, role: "student" })

    return {
        totalStaff,
        totalStudents,
        deptName: dept.name,
        deptCode: dept.code
    }
}

export async function assignHOD(deptId: string, teacherId: string) {
    const db = await getDB()
    let filter = { id: deptId }
    let dept = await db.collection("departments").findOne(filter)
    if (!dept) {
        try { filter = { _id: new ObjectId(deptId) } as any } catch (e) { }
    }

    await db.collection("departments").updateOne(filter, { $set: { hodId: teacherId } })
    return { success: true }
}
