
import { getDepartmentStats, getDepartmentById } from "@/app/actions/department"
import { getDepartmentTimetable } from "@/app/actions/teachers"
import { getClasses } from "@/app/actions/classes"
import { DepartmentProfile } from "@/components/admin/department/department-profile"
import { notFound } from "next/navigation"

interface PageProps {
    params: Promise<{ id: string }>
}

export default async function DepartmentPage(props: PageProps) {
    const params = await props.params;
    const department = await getDepartmentById(params.id)
    if (!department) {
        notFound()
    }

    const [stats, timetable, classes] = await Promise.all([
        getDepartmentStats(params.id),
        getDepartmentTimetable(department.id), // Use ID
        getClasses(department.id) // Use ID
    ])

    if (!stats) return null

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <DepartmentProfile
                department={department}
                stats={stats}
                timetable={timetable}
                classes={classes}
            />
        </div>
    )
}
