
import { Suspense } from "react"
import { getDashboardStats } from "@/app/actions/admin"
import { getAttendanceDashboardStats, getRecentAttendance } from "@/app/actions/attendance"
import { RecentAttendanceTable } from "@/components/admin/recent-attendance-table"
import { AttendanceSummary } from "@/components/admin/attendance/attendance-summary"
import { ExportControls } from "@/components/admin/attendance/export-controls"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { AdminSearch } from "@/components/admin/admin-search"
import { Users, GraduationCap, Building2, AlertTriangle, TrendingUp } from "lucide-react"

export default async function AdminAttendancePage() {
    // Parallel data fetching for performance
    const [logs, stats] = await Promise.all([
        getRecentAttendance(),
        getAttendanceDashboardStats()
    ])

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            {/* Top Header & Search - "One Search Bar Does Everything" */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Main Attendance Dashboard</h1>
                    <p className="text-muted-foreground">Overview, Universal Search, and Real-time Status.</p>
                </div>
                <div className="w-full md:w-auto flex items-center gap-2">
                    <AdminSearch />
                    <ExportControls />
                </div>
            </div>

            {/* 1. Main Dashboard Summary Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="hover:bg-muted/50 transition-colors cursor-pointer border-l-4 border-l-primary">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                        <GraduationCap className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalStudents}</div>
                        <p className="text-xs text-muted-foreground">
                            Registered in the system
                        </p>
                    </CardContent>
                </Card>
                <Card className="hover:bg-muted/50 transition-colors cursor-pointer border-l-4 border-l-green-500">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Overall Attendance</CardTitle>
                        <TrendingUp className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.overallPercentage}%</div>
                        <p className="text-xs text-muted-foreground">
                            Campus-wide average
                        </p>
                    </CardContent>
                </Card>
                <Card className="hover:bg-muted/50 transition-colors cursor-pointer border-l-4 border-l-red-500">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Below 75% (Critical)</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.defaultersCount}</div>
                        <p className="text-xs text-muted-foreground">
                            Students at risk
                        </p>
                    </CardContent>
                </Card>
                <Card className="hover:bg-muted/50 transition-colors cursor-pointer border-l-4 border-l-blue-500">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Departments</CardTitle>
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalDepartments}</div>
                        <p className="text-xs text-muted-foreground">
                            Active departments
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Department-wise Breakdown & Filters */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold tracking-tight">Department Summary</h2>
                </div>
                <AttendanceSummary />
            </div>

            {/* Recent Activity Feed */}
            <Card>
                <CardHeader>
                    <CardTitle>Recent Activity (Live)</CardTitle>
                    <CardDescription>Real-time stream of check-ins from all devices.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
                        <RecentAttendanceTable initialData={logs} />
                    </Suspense>
                </CardContent>
            </Card>
        </div>
    )
}
