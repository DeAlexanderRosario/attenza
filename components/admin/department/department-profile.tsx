"use client"

import { Department, Slot, Class } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Users, UserCheck, UserPlus, GraduationCap } from "lucide-react"
import { StaffAllocation } from "./staff-allocation"
import { DepartmentTimetable } from "./department-timetable"
import { DepartmentClasses } from "./department-classes"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"

interface DepartmentProfileProps {
    department: Department
    stats: {
        totalStaff: number
        maleStaff: number
        femaleStaff: number
        totalStudents: number
        deptName: string
        chartData?: any[]
    }
    timetable: Slot[]
    classes: Class[]
}

export function DepartmentProfile({ department, stats, timetable, classes }: DepartmentProfileProps) {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">{department.name}</h2>
                    <p className="text-muted-foreground">{department.description || "Department Profile and Management"}</p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Staff</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalStaff}</div>
                        <p className="text-xs text-muted-foreground">
                            {stats.maleStaff} Male, {stats.femaleStaff} Female
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                        <GraduationCap className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalStudents}</div>
                        <p className="text-xs text-muted-foreground">
                            Enrolled in this department
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Classes</CardTitle>
                        <UserCheck className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{classes.length}</div>
                        <p className="text-xs text-muted-foreground">
                            Active batches
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Department Code</CardTitle>
                        <UserPlus className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{department.code}</div>
                        <p className="text-xs text-muted-foreground">
                            Established {new Date(department.createdAt).getFullYear()}
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="overview" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="classes">Classes</TabsTrigger>
                    <TabsTrigger value="staff">Staff Allocation</TabsTrigger>
                    <TabsTrigger value="timetable">Timetable</TabsTrigger>
                </TabsList>
                <TabsContent value="overview" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Attendance Summary</CardTitle>
                        </CardHeader>
                        <CardContent className="pl-2">
                            <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                                Graph placeholder (Department specific attendance)
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="classes" className="space-y-4">
                    <DepartmentClasses departmentId={department.id} departmentCode={department.code} initialClasses={classes} />
                </TabsContent>
                <TabsContent value="staff" className="space-y-4">
                    <StaffAllocation departmentId={department.id} departmentCode={department.code} />
                </TabsContent>
                <TabsContent value="timetable" className="space-y-4">
                    <DepartmentTimetable slots={timetable} departmentCode={department.code} classes={classes} />
                </TabsContent>
            </Tabs>
        </div>
    )
}
