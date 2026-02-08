"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Download, FileBarChart, PieChart, TrendingUp, Loader2 } from "lucide-react"
import { getDetailedAttendanceReport } from "@/app/actions/attendance"
import { exportToCSV } from "@/lib/export-utils"
import { toast } from "sonner"

import { DefaulterList } from "@/components/teacher/DefaulterList"

export default function TeacherReportsPage() {
    const [isExportingWeekly, setIsExportingWeekly] = useState(false)
    const [isExportingMonthly, setIsExportingMonthly] = useState(false)
    const [showDefaulters, setShowDefaulters] = useState(false)

    const handleExport = async (type: "weekly" | "monthly") => {
        const setter = type === "weekly" ? setIsExportingWeekly : setIsExportingMonthly
        setter(true)
        try {
            const now = new Date()
            const startDate = new Date()
            if (type === "weekly") {
                startDate.setDate(now.getDate() - 7)
            } else {
                startDate.setMonth(now.getMonth() - 1)
            }

            const data = await getDetailedAttendanceReport("monthly", {
                startDate,
                endDate: now
            })

            if (data.length === 0) {
                toast.error("No attendance records found for this period.")
                return
            }

            exportToCSV(data, `Attendance_Report_${type}_${now.toISOString().split('T')[0]}`)
            toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} report exported successfully!`)
        } catch (error) {
            console.error("Export failed:", error)
            toast.error("Failed to generate report. Please try again.")
        } finally {
            setter(false)
        }
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-foreground">Attendance Reports</h1>
                <p className="text-muted-foreground">Analyze and download class attendance data</p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                <Card className="hover:ring-1 hover:ring-primary/20 transition-all">
                    <CardHeader>
                        <TrendingUp className="size-8 text-primary mb-2" />
                        <CardTitle>Weekly Insights</CardTitle>
                        <CardDescription>Detailed breakdown of attendance for the current week.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button
                            className="w-full"
                            variant="outline"
                            disabled={isExportingWeekly}
                            onClick={() => handleExport("weekly")}
                        >
                            {isExportingWeekly ? (
                                <Loader2 className="mr-2 size-4 animate-spin" />
                            ) : (
                                <Download className="mr-2 size-4" />
                            )}
                            Export CSV
                        </Button>
                    </CardContent>
                </Card>

                <Card className="hover:ring-1 hover:ring-chart-2/20 transition-all">
                    <CardHeader>
                        <PieChart className="size-8 text-chart-2 mb-2" />
                        <CardTitle>Monthly Summary</CardTitle>
                        <CardDescription>Consolidated attendance records for all your classes this month.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button
                            className="w-full"
                            variant="outline"
                            disabled={isExportingMonthly}
                            onClick={() => handleExport("monthly")}
                        >
                            {isExportingMonthly ? (
                                <Loader2 className="mr-2 size-4 animate-spin" />
                            ) : (
                                <Download className="mr-2 size-4" />
                            )}
                            Export CSV
                        </Button>
                    </CardContent>
                </Card>

                <Card className="hover:ring-1 hover:ring-chart-3/20 transition-all">
                    <CardHeader>
                        <FileBarChart className="size-8 text-chart-3 mb-2" />
                        <CardTitle>Defaulter List</CardTitle>
                        <CardDescription>Identify students with attendance below the required 75% threshold.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button
                            className="w-full"
                            variant={showDefaulters ? "default" : "outline"}
                            onClick={() => setShowDefaulters(!showDefaulters)}
                        >
                            <FileBarChart className="mr-2 size-4" />
                            {showDefaulters ? "Hide List" : "View List"}
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {showDefaulters && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-500">
                    <DefaulterList />
                </div>
            )}

            <Card className="border-none shadow-lg overflow-hidden ring-1 ring-border/50">
                <CardHeader className="bg-muted/30 pb-4">
                    <CardTitle>Custom Report Generation</CardTitle>
                    <CardDescription>Advanced filters for specific date ranges, departments, and classes.</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                    <div className="h-40 flex flex-col items-center justify-center border-2 border-dashed rounded-2xl bg-muted/20 gap-3">
                        <Loader2 className="h-8 w-8 text-muted-foreground/30" />
                        <p className="text-muted-foreground uppercase text-[10px] font-black tracking-widest">Advanced Filter Builder Under Construction</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
