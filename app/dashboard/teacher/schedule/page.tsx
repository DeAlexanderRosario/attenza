"use client"

import { useAuth } from "@/lib/auth-context"
import { TeacherWeeklyTimetable } from "@/components/teacher/TeacherWeeklyTimetable"

export default function TeacherSchedulePage() {
    const { user } = useAuth()

    if (!user || user.role !== "teacher") {
        return null
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-foreground">My Schedule</h1>
                <p className="text-muted-foreground">Your weekly teaching timetable</p>
            </div>

            <TeacherWeeklyTimetable teacherId={user.id} />
        </div>
    )
}
