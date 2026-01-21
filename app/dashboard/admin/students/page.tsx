import { Suspense } from "react"
import { StudentsTable } from "@/components/admin/students-table"
import { getStudents } from "@/app/actions/admin"
import { Skeleton } from "@/components/ui/skeleton"
import { AddStudentDialog } from "@/components/admin/add-student-dialog"
import { ImportExportButtons } from "@/components/admin/import-export-buttons"

export default async function StudentsPage() {
    const students = await getStudents()

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Students</h1>
                    <p className="text-muted-foreground">
                        Manage student enrollment and batch assignments.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <ImportExportButtons data={students} />
                    <AddStudentDialog />
                </div>
            </div>
            <Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
                <StudentsTable initialData={students} />
            </Suspense>
        </div>
    )
}
