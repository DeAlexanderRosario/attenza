"use client"

import { useState, useEffect } from "react"
import { getTeacherAttendanceAnalytics } from "@/app/actions/attendance"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { format } from "date-fns"
import { Loader2, Calendar, Clock, Timer, CheckCircle2, XCircle, AlertCircle, Filter, Award, Activity } from "lucide-react"

interface TeacherAttendanceDetailProps {
    teacherId: string
}

export function TeacherAttendanceDetail({ teacherId }: TeacherAttendanceDetailProps) {
    const [loading, setLoading] = useState(true)
    const [data, setData] = useState<any>(null)
    const [startDate, setStartDate] = useState<string>("")
    const [endDate, setEndDate] = useState<string>("")

    useEffect(() => {
        if (teacherId) {
            fetchStats()
        }
    }, [teacherId, startDate, endDate])

    async function fetchStats() {
        setLoading(true)
        try {
            const filters: any = {}
            if (startDate) filters.startDate = new Date(startDate)
            if (endDate) filters.endDate = new Date(endDate)

            const result = await getTeacherAttendanceAnalytics(teacherId, filters)
            setData(result)
        } finally {
            setLoading(false)
        }
    }

    if (loading && !data) {
        return (
            <div className="flex flex-col items-center justify-center p-12 space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground font-medium uppercase tracking-widest text-[10px]">Analyzing Sessions...</p>
            </div>
        )
    }

    if (!data) return <div className="p-8 text-center text-muted-foreground">Teacher record not found.</div>

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            {/* Header Info */}
            <div className="p-6 rounded-3xl bg-gradient-to-br from-primary/10 to-transparent border border-primary/20 relative overflow-hidden">
                <div className="relative z-10">
                    <h2 className="text-2xl font-black tracking-tight">{data.teacher.name}</h2>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-muted-foreground font-bold">
                        <span>{data.teacher.email}</span>
                        <span>•</span>
                        <span className="text-primary">{data.teacher.department || "General"} Department</span>
                    </div>
                </div>
                <Activity className="absolute -right-4 -bottom-4 h-32 w-32 text-primary/5 opacity-20" />
            </div>

            {/* Performance Stats Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card className="border-0 bg-muted/20 shadow-none overflow-hidden relative group">
                    <CardContent className="p-4">
                        <div className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Sessions Held</div>
                        <div className="text-2xl font-black mt-1">{data.stats.activeSessions}</div>
                        <div className="text-[10px] text-muted-foreground mt-1">out of {data.stats.totalSessions} scheduled</div>
                        <div className="absolute top-2 right-2 p-1.5 rounded-lg bg-primary/10 text-primary opacity-30 group-hover:opacity-100 transition-opacity">
                            <Calendar className="h-3 w-3" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-0 bg-muted/20 shadow-none overflow-hidden relative group">
                    <CardContent className="p-4">
                        <div className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Punctuality Score</div>
                        <div className="text-2xl font-black mt-1 text-green-500">{100 - (data.stats.avgDelay > 10 ? 15 : 0)}%</div>
                        <div className="text-[10px] text-muted-foreground mt-1">Avg Delay: {data.stats.avgDelay}m</div>
                        <div className="absolute top-2 right-2 p-1.5 rounded-lg bg-green-500/10 text-green-500 opacity-30 group-hover:opacity-100 transition-opacity">
                            <Clock className="h-3 w-3" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-0 bg-muted/20 shadow-none overflow-hidden relative group">
                    <CardContent className="p-4">
                        <div className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Consistency</div>
                        <div className="text-2xl font-black mt-1">{data.stats.consistencyScore}%</div>
                        <div className="text-[10px] text-muted-foreground mt-1">Success Rate</div>
                        <div className="absolute top-2 right-2 p-1.5 rounded-lg bg-orange-500/10 text-orange-500 opacity-30 group-hover:opacity-100 transition-opacity">
                            <Award className="h-3 w-3" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-0 bg-muted/20 shadow-none overflow-hidden relative group">
                    <CardContent className="p-4">
                        <div className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Missed / Absent</div>
                        <div className="text-2xl font-black mt-1 text-red-500">{data.stats.missedSessions}</div>
                        <div className="text-[10px] text-muted-foreground mt-1 text-red-500/60 transition-colors">Requires Review</div>
                        <div className="absolute top-2 right-2 p-1.5 rounded-lg bg-red-500/10 text-red-500 opacity-30 group-hover:opacity-100 transition-opacity">
                            <AlertCircle className="h-3 w-3" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Session Detail Log */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2">
                        <Activity className="h-4 w-4" /> Academic Session Ledger
                    </h3>
                    <div className="flex items-center gap-2">
                        <Input
                            type="date"
                            className="h-8 text-[10px] w-32 bg-muted/30 border-0"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                        <span className="text-[10px] font-black opacity-30">—</span>
                        <Input
                            type="date"
                            className="h-8 text-[10px] w-32 bg-muted/30 border-0"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                        />
                    </div>
                </div>

                <div className="rounded-3xl border border-border/50 bg-card/10 backdrop-blur-sm overflow-hidden">
                    <Table>
                        <TableHeader className="bg-muted/30">
                            <TableRow>
                                <TableHead className="text-[10px] font-black uppercase tracking-wider">Session Details</TableHead>
                                <TableHead className="text-[10px] font-black uppercase tracking-wider">Timeline</TableHead>
                                <TableHead className="text-[10px] font-black uppercase tracking-wider text-center">Attendance</TableHead>
                                <TableHead className="text-[10px] font-black uppercase tracking-wider">Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.logs.map((log: any) => (
                                <TableRow key={log.id} className="group hover:bg-primary/5 transition-all duration-300">
                                    <TableCell className="py-4">
                                        <div className="font-bold text-sm">{log.subject}</div>
                                        <div className="flex items-center gap-2 mt-1">
                                            <Badge variant="outline" className="text-[8px] font-black h-4 px-1">{log.subjectCode}</Badge>
                                            <span className="text-[10px] text-muted-foreground font-mono opacity-60">Room: {log.room}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="text-[11px] font-bold">{format(new Date(log.startTime), "MMM d, yyyy")}</div>
                                        <div className="text-[9px] text-muted-foreground mt-0.5 font-mono">
                                            {format(new Date(log.startTime), "hh:mm a")} — {format(new Date(log.endTime), "hh:mm a")}
                                        </div>
                                        {log.arrivedAt && (
                                            <div className="text-[9px] text-primary font-black mt-1 flex items-center gap-1">
                                                <Clock className="h-2 w-2" /> Arrived: {format(new Date(log.arrivedAt), "hh:mm:ss a")}
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <div className="inline-flex flex-col items-center p-2 rounded-2xl bg-muted/20 min-w-[60px]">
                                            <span className="text-sm font-black">{log.studentCount}</span>
                                            <span className="text-[8px] font-black uppercase opacity-40">Students</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant={(log.status === 'ACTIVE' || log.status === 'CLOSED' || log.arrivedAt) ? "secondary" : "destructive"}
                                            className={`text-[9px] font-black px-2 h-5 rounded-full ${(log.status === 'CLOSED' || (log.status === 'CANCELLED' && log.arrivedAt)) ? "bg-green-500/10 text-green-500 border-green-500/10" :
                                                    log.status === 'ACTIVE' ? "bg-blue-500/10 text-blue-500 border-blue-500/10" :
                                                        log.status === 'RE_VERIFICATION' ? "bg-purple-500/10 text-purple-500 border-purple-500/10 animate-pulse" :
                                                            log.status === 'WAITING_FOR_TEACHER' ? "bg-yellow-500/10 text-yellow-600 border-yellow-500/10" :
                                                                "bg-red-500/10 text-red-500 border-red-500/10"
                                                }`}
                                        >
                                            {log.status === 'CLOSED' && <CheckCircle2 className="h-2 w-2 mr-1" />}
                                            {log.arrivedAt ? (log.status === 'ACTIVE' ? "ONGOING" : "CONDUCTED") :
                                                log.status === 'WAITING_FOR_TEACHER' ? "UPCOMING / WAITING" :
                                                    log.status === 'RE_VERIFICATION' ? "RE-CHECK" :
                                                        log.status === 'CANCELLED' ? "MISSED / NO SHOW" : log.status}
                                            {log.isOverride && <span className="ml-1 opacity-50 text-[7px] uppercase tracking-tighter">(Override)</span>}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    {data.logs.length === 0 && (
                        <div className="p-16 text-center">
                            <XCircle className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-10" />
                            <p className="text-xs text-muted-foreground font-bold uppercase tracking-[0.2em]">No Session Records Found</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
