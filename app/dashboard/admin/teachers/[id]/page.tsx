import { getTeacherById, getTeacherSubjects, getTeacherTimetable } from "@/app/actions/teacher-profile"
import { TeacherProfile } from "@/components/admin/teacher/teacher-profile"
import { notFound } from "next/navigation"

interface PageProps {
    params: Promise<{ id: string }>
}

export default async function TeacherProfilePage(props: PageProps) {
    const params = await props.params
    const teacher = await getTeacherById(params.id)

    if (!teacher) {
        notFound()
    }

    const [subjects, timetable] = await Promise.all([
        getTeacherSubjects(params.id),
        getTeacherTimetable(params.id)
    ])

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <TeacherProfile
                teacher={teacher}
                subjects={subjects}
                timetable={timetable}
            />
        </div>
    )
}
