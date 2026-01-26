
import { Suspense } from "react"
import { getAttendanceDashboardStats, getRecentAttendance } from "@/app/actions/attendance"
import { getDepartments } from "@/app/actions/department"
import { AttendanceDashboardClient } from "@/components/admin/attendance/attendance-dashboard-client"
import { AttendanceSummary } from "@/components/admin/attendance/attendance-summary"
import { ExportControls } from "@/components/admin/attendance/export-controls"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { AdminSearch } from "@/components/admin/admin-search"
import { GraduationCap, Building2, AlertTriangle, TrendingUp } from "lucide-react"

export default async function AdminAttendancePage() {
    // Parallel data fetching
    const [logs, stats, departments] = await Promise.all([
        getRecentAttendance(20),
        getAttendanceDashboardStats(),
        getDepartments()
    ])

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-10">
            {/* Top Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-blue-500 to-indigo-600 bg-clip-text text-transparent">
                        Attendance Hub
                    </h1>
                    <p className="text-muted-foreground flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                        </span>
                        Enterprise-grade monitoring and granular reporting.
                    </p>
                </div>
                <div className="w-full md:w-auto flex items-center gap-2">
                    <AdminSearch />
                    <ExportControls />
                </div>
            </div>

            {/* 1. Dashboard Summary Stats */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Card className="group relative overflow-hidden bg-card/40 backdrop-blur-md border border-border/50 hover:border-primary/50 transition-all duration-500 shadow-xl hover:shadow-primary/20 border-l-4 border-l-primary">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground group-hover:text-primary transition-colors">Total Students</CardTitle>
                        <GraduationCap className="h-5 w-5 text-primary group-hover:scale-110 transition-transform" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-black tracking-tight">{stats.totalStudents}</div>
                        <p className="text-[10px] font-medium text-muted-foreground mt-2 flex items-center gap-1">
                            <span className="h-1 w-1 rounded-full bg-primary" /> Active Campus Registry
                        </p>
                    </CardContent>
                </Card>

                <Card className="group relative overflow-hidden bg-card/40 backdrop-blur-md border border-border/50 hover:border-green-500/50 transition-all duration-500 shadow-xl hover:shadow-green-500/20 border-l-4 border-l-green-500">
                    <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground group-hover:text-green-500 transition-colors">Overall Rate</CardTitle>
                        <TrendingUp className="h-5 w-5 text-green-500 group-hover:scale-110 transition-transform" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-black tracking-tight">{stats.overallPercentage}%</div>
                        <p className="text-[10px] font-medium text-muted-foreground mt-2 flex items-center gap-1">
                            <span className="h-1 w-1 rounded-full bg-green-500" /> Institutional Average
                        </p>
                    </CardContent>
                </Card>

                <Card className="group relative overflow-hidden bg-card/40 backdrop-blur-md border border-border/50 hover:border-red-500/50 transition-all duration-500 shadow-xl hover:shadow-red-500/20 border-l-4 border-l-red-500">
                    <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground group-hover:text-red-500 transition-colors">Critical Status</CardTitle>
                        <AlertTriangle className="h-5 w-5 text-red-500 group-hover:scale-110 transition-transform" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-black tracking-tight">{stats.defaultersCount}</div>
                        <p className="text-[10px] font-medium text-muted-foreground mt-2 flex items-center gap-1">
                            <span className="h-1 w-1 rounded-full bg-red-500" /> Below 75% Threshold
                        </p>
                    </CardContent>
                </Card>

                <Card className="group relative overflow-hidden bg-card/40 backdrop-blur-md border border-border/50 hover:border-blue-500/50 transition-all duration-500 shadow-xl hover:shadow-blue-500/20 border-l-4 border-l-blue-500">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground group-hover:text-blue-500 transition-colors">Departments</CardTitle>
                        <Building2 className="h-5 w-5 text-blue-500 group-hover:scale-110 transition-transform" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-black tracking-tight">{stats.totalDepartments}</div>
                        <p className="text-[10px] font-medium text-muted-foreground mt-2 flex items-center gap-1">
                            <span className="h-1 w-1 rounded-full bg-blue-500" /> Faculties & Wings
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Main Interactive Dashboard Area */}
            <div className="p-[2px] rounded-[2.5rem] bg-gradient-to-br from-primary/20 via-border/50 to-indigo-500/20 border border-border/50 shadow-2xl">
                <Card className="border-0 bg-card/60 backdrop-blur-2xl shadow-none overflow-hidden rounded-[2.4rem]">
                    <CardContent className="p-4 md:p-8">
                        <Suspense fallback={
                            <div className="space-y-4">
                                <Skeleton className="h-10 w-full rounded-xl" />
                                <Skeleton className="h-[600px] w-full rounded-2xl" />
                            </div>
                        }>
                            <AttendanceDashboardClient
                                initialLogs={logs}
                                departments={departments}
                            />
                        </Suspense>
                    </CardContent>
                </Card>
            </div>

            {/* Legacy Department Table (Optional/Secondary) */}
            <div className="px-4">
                <details className="cursor-pointer group">
                    <summary className="text-sm font-medium text-muted-foreground flex items-center gap-2 hover:text-foreground transition-colors">
                        View Department Summaries
                        <span className="text-xs opacity-50 group-open:rotate-180 transition-transform">▼</span>
                    </summary>
                    <div className="mt-4 animate-in fade-in zoom-in-95 duration-300">
                        <AttendanceSummary />
                    </div>
                </details>
            </div>
        </div>
    )
}
