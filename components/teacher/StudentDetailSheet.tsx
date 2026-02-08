"use client"

import { useState, useEffect } from "react"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Clock, CheckCircle, XCircle, AlertCircle, Calendar as CalendarIcon, PieChart, TrendingUp } from "lucide-react"
import { getStudentAttendanceDetails } from "@/app/actions/attendance"
import { cn } from "@/lib/utils"

interface StudentDetailSheetProps {
    studentId: string
    studentName: string
    teacherId: string
    children: React.ReactNode
}

export function StudentDetailSheet({ studentId, studentName, teacherId, children }: StudentDetailSheetProps) {
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(false)
    const [open, setOpen] = useState(false)

    useEffect(() => {
        if (open && studentId) {
            const fetchData = async () => {
                setLoading(true)
                try {
                    const result = await getStudentAttendanceDetails(studentId)
                    setData(result)
                } catch (error) {
                    console.error("Failed to fetch student details:", error)
                } finally {
                    setLoading(false)
                }
            }
            fetchData()
        }
    }, [open, studentId])

    // Filter logs for this teacher
    const teacherLogs = data?.logs?.filter((log: any) => {
        // In a real scenario, we'd match by teacherId if it's in the log
        // For now, we'll show all but we could highlight teacher specific ones if we had that mapping
        return true
    }) || []

    const stats = data?.subjects?.find((s: any) => s.attended > 0) || { total: 0, attended: 0, percentage: 0 }

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                {children}
            </SheetTrigger>
            <SheetContent className="sm:max-w-md md:max-w-lg overflow-y-auto">
                <SheetHeader className="pb-6">
                    <SheetTitle className="text-2xl font-bold">{studentName}</SheetTitle>
                    <SheetDescription>
                        Detailed attendance history and performance metrics.
                    </SheetDescription>
                </SheetHeader>

                {loading ? (
                    <div className="flex flex-col items-center justify-center h-64 gap-4">
                        <div className="h-8 w-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                        <p className="text-sm font-medium text-muted-foreground">Fetching records...</p>
                    </div>
                ) : data ? (
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <Card className="border-none bg-primary/5 shadow-none ring-1 ring-primary/10">
                                <CardHeader className="p-4 pb-2">
                                    <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Overall Rate</CardTitle>
                                </CardHeader>
                                <CardContent className="p-4 pt-0">
                                    <div className="text-2xl font-black text-primary">{data?.subjects?.[0]?.percentage || 0}%</div>
                                </CardContent>
                            </Card>
                            <Card className="border-none bg-emerald-500/5 shadow-none ring-1 ring-emerald-500/10">
                                <CardHeader className="p-4 pb-2">
                                    <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Sessions Attended</CardTitle>
                                </CardHeader>
                                <CardContent className="p-4 pt-0">
                                    <div className="text-2xl font-black text-emerald-600">{data?.subjects?.[0]?.attended || 0}/{data?.subjects?.[0]?.total || 0}</div>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="space-y-3">
                            <h3 className="text-sm font-bold flex items-center gap-2 text-muted-foreground uppercase tracking-widest">
                                <PieChart className="h-4 w-4" />
                                Subject Breakdown
                            </h3>
                            <div className="space-y-2">
                                {data.subjects.map((sub: any) => (
                                    <div key={sub.subjectCode} className="p-3 rounded-xl border border-border/50 bg-card flex items-center justify-between">
                                        <div>
                                            <div className="font-bold text-sm">{sub.subjectName}</div>
                                            <div className="text-[10px] text-muted-foreground font-mono">{sub.subjectCode}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className={cn(
                                                "font-bold text-sm",
                                                sub.percentage >= 75 ? "text-emerald-500" : "text-rose-500"
                                            )}>
                                                {sub.percentage}%
                                            </div>
                                            <div className="text-[10px] text-muted-foreground">{sub.attended}/{sub.total} sessions</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-3">
                            <h3 className="text-sm font-bold flex items-center gap-2 text-muted-foreground uppercase tracking-widest">
                                <Clock className="h-4 w-4" />
                                Recent Activity
                            </h3>
                            <div className="space-y-2">
                                {teacherLogs.slice(0, 10).map((log: any) => (
                                    <div key={log.id} className="p-3 rounded-xl border border-border/40 flex items-center justify-between bg-muted/20">
                                        <div className="flex gap-3 items-center">
                                            <div className={cn(
                                                "p-2 rounded-lg",
                                                log.status === 'present' ? "bg-emerald-500/10 text-emerald-500" :
                                                    log.status === 'late' ? "bg-amber-500/10 text-amber-500" : "bg-rose-500/10 text-rose-500"
                                            )}>
                                                {log.status === 'present' ? <CheckCircle className="h-4 w-4" /> :
                                                    log.status === 'late' ? <Clock className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                                            </div>
                                            <div>
                                                <div className="font-bold text-xs">{log.subject}</div>
                                                <div className="text-[10px] text-muted-foreground">
                                                    {new Date(log.date).toLocaleDateString()} • {log.time}
                                                </div>
                                            </div>
                                        </div>
                                        {log.lateMins && (
                                            <Badge variant="outline" className="text-[9px] text-amber-600 bg-amber-50 border-amber-200">
                                                {log.lateMins}m late
                                            </Badge>
                                        )}
                                    </div>
                                ))}
                                {teacherLogs.length === 0 && (
                                    <div className="text-center py-8 text-muted-foreground italic text-xs">
                                        No recent activity recorded.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-12 text-muted-foreground">
                        No data available for this student.
                    </div>
                )}
            </SheetContent>
        </Sheet>
    )
}
