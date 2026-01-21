import { notFound } from "next/navigation"
import { getDB } from "@/lib/db"
import { ObjectId } from "mongodb"
import { StudentProfileClient } from "@/components/admin/student-profile-client"

interface Props {
    params: Promise<{ id: string }>
}

export default async function StudentProfilePage(props: Props) {
    const params = await props.params
    const db = await getDB()

    // Fetch student with all details
    let student = await db.collection("users").findOne({ id: params.id, role: "student" })
    if (!student) {
        try {
            student = await db.collection("users").findOne({ _id: new ObjectId(params.id), role: "student" })
        } catch (e) {
            // Invalid ObjectId format
        }
    }

    if (!student) {
        notFound()
    }

    // Fetch department and class names
    const [department, classInfo] = await Promise.all([
        student.departmentId ? db.collection("departments").findOne({ id: student.departmentId }) : null,
        student.classId ? db.collection("classes").findOne({ id: student.classId }) : null
    ])

    // Fetch attendance records
    const attendanceRecords = await db.collection("attendance")
        .find({ studentId: student.id || student._id.toString() })
        .sort({ timestamp: -1 })
        .limit(100)
        .toArray()

    // Calculate stats
    const totalRecords = attendanceRecords.length
    const presentCount = attendanceRecords.filter(r => r.status === "present").length
    const lateCount = attendanceRecords.filter(r => r.status === "late").length
    const absentCount = attendanceRecords.filter(r => r.status === "absent").length
    const attendanceRate = totalRecords > 0 ? Math.round((presentCount / totalRecords) * 100) : 0

    // Get attendance by day for chart (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const recentAttendance = await db.collection("attendance").aggregate([
        {
            $match: {
                studentId: student.id || student._id.toString(),
                timestamp: { $gte: thirtyDaysAgo }
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

    const studentData = {
        ...student,
        id: student.id || student._id.toString(),
        departmentName: department?.name || "Unknown",
        departmentCode: department?.code || "N/A",
        className: classInfo?.name || "Unassigned",
        parent: student.parent || {},
        address: student.address || {}
    }

    const stats = {
        attendanceRate,
        totalClasses: totalRecords,
        presentCount,
        lateCount,
        absentCount,
        points: student.points || 0,
        chartData: recentAttendance.map((r: any) => ({
            date: r._id,
            present: r.present,
            late: r.late,
            absent: r.absent
        }))
    }

    const attendanceHistory = attendanceRecords.map(r => ({
        id: r.id || r._id.toString(),
        date: r.timestamp,
        status: r.status,
        points: r.pointsEarned || 0,
        slotId: r.slotId
    }))

    return (
        <StudentProfileClient
            student={studentData}
            stats={stats}
            attendanceHistory={attendanceHistory}
        />
    )
}
