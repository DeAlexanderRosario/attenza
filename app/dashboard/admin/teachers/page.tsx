import { getTeachers } from "@/app/actions/teachers"
import { getDepartments } from "@/app/actions/department"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Mail, Building2 } from "lucide-react"
import Link from "next/link"

export default async function TeachersPage() {
    const [teachers, departments] = await Promise.all([
        getTeachers(),
        getDepartments()
    ])

    // Group teachers by department (Using ID match)
    const teachersByDept = departments.map(dept => ({
        department: dept,
        teachers: teachers.filter(t => t.departmentId === dept.id || t.homeDepartment === dept.code)
    }))

    const totalTeachers = teachers.length

    return (
        <div className="flex-1 space-y-6 p-8 pt-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <Users className="h-8 w-8" />
                        Teachers
                    </h2>
                    <p className="text-muted-foreground mt-1">
                        View all teachers organized by department
                    </p>
                </div>
            </div>

            {/* Stats Card */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Teachers</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{totalTeachers}</div>
                        <p className="text-xs text-muted-foreground">Across all departments</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Departments</CardTitle>
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{departments.length}</div>
                        <p className="text-xs text-muted-foreground">With teaching staff</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Average per Dept</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">
                            {departments.length > 0 ? Math.round(totalTeachers / departments.length) : 0}
                        </div>
                        <p className="text-xs text-muted-foreground">Teachers per department</p>
                    </CardContent>
                </Card>
            </div>

            {/* Teachers by Department */}
            <div className="space-y-6">
                {teachersByDept.map(({ department, teachers }) => (
                    <Card key={department.id}>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-xl flex items-center gap-2">
                                        <Building2 className="h-5 w-5" />
                                        {department.name}
                                    </CardTitle>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        {department.code} • {teachers.length} {teachers.length === 1 ? 'Teacher' : 'Teachers'}
                                    </p>
                                </div>
                                <Link
                                    href={`/dashboard/admin/departments/${department.id}`}
                                    className="text-sm text-primary hover:underline"
                                >
                                    View Department →
                                </Link>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {teachers.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    No teachers assigned to this department
                                </div>
                            ) : (
                                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                    {teachers.map(teacher => (
                                        <div
                                            key={teacher.id}
                                            className="flex items-center gap-3 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                                        >
                                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                                                {teacher.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium truncate">{teacher.name}</p>
                                                <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                                                    <Mail className="h-3 w-3" />
                                                    {teacher.email}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}
