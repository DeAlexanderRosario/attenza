import { getDepartments } from "@/app/actions/department"
import { DepartmentsClient } from "@/components/admin/departments-client"

export default async function DepartmentsPage() {
    const departments = await getDepartments()

    return <DepartmentsClient initialDepartments={departments} />
}
