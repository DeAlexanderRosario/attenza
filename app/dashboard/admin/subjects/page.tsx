import { Suspense } from "react"
import { getSubjects } from "@/app/actions/subjects"
import { getDepartments } from "@/app/actions/department"
import { SubjectsClient } from "@/components/admin/subjects/subjects-client"
import { Skeleton } from "@/components/ui/skeleton"
import { BookOpen, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"

export default async function SubjectsPage() {
    const [subjects, departments] = await Promise.all([
        getSubjects(),
        getDepartments()
    ])

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <BookOpen className="h-8 w-8 text-primary" />
                        Subject Management
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Manage subjects, map to departments, and assign teachers
                    </p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 p-6 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="text-sm font-medium text-blue-700 dark:text-blue-300">Total Subjects</div>
                    <div className="text-3xl font-bold mt-2 text-blue-900 dark:text-blue-100">{subjects.length}</div>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 p-6 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="text-sm font-medium text-green-700 dark:text-green-300">Common Subjects</div>
                    <div className="text-3xl font-bold mt-2 text-green-900 dark:text-green-100">
                        {subjects.filter(s => s.type === "common").length}
                    </div>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 p-6 rounded-lg border border-purple-200 dark:border-purple-800">
                    <div className="text-sm font-medium text-purple-700 dark:text-purple-300">Unique Subjects</div>
                    <div className="text-3xl font-bold mt-2 text-purple-900 dark:text-purple-100">
                        {subjects.filter(s => s.type === "unique").length}
                    </div>
                </div>
            </div>

            {/* Subjects Table */}
            <Suspense fallback={<Skeleton className="h-[600px] w-full" />}>
                <SubjectsClient initialSubjects={subjects} departments={departments} />
            </Suspense>
        </div>
    )
}
