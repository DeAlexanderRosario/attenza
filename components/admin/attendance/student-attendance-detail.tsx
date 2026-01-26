"use client"

import { useState, useEffect } from "react"
import { getStudentAttendanceDetails } from "@/app/actions/attendance"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { format } from "date-fns"
import { BookOpen, Calendar, Clock, Loader2, CheckCircle2, XCircle, Timer, AlertCircle, Filter } from "lucide-react"

interface StudentAttendanceDetailProps {
    userId: string
}

export function StudentAttendanceDetail({ userId }: StudentAttendanceDetailProps) {
    const [loading, setLoading] = useState(true)
    const [data, setData] = useState<any>(null)
    const [startDate, setStartDate] = useState<string>("")
    const [endDate, setEndDate] = useState<string>("")

    useEffect(() => {
        if (userId) {
            fetchDetails()
        }
    }, [userId, startDate, endDate])

    async function fetchDetails() {
        setLoading(true)
        try {
            const filters: any = {}
            if (startDate) filters.startDate = new Date(startDate)
            if (endDate) filters.endDate = new Date(endDate)

            const result = await getStudentAttendanceDetails(userId, filters)
            setData(result)
        } finally {
            setLoading(false)
        }
    }

    if (loading && !data) {
        return (
            <div className="flex flex-col items-center justify-center p-12 space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground font-medium">Loading performance metrics...</p>
            </div>
        )
    }

    if (!data) return <div className="p-8 text-center text-muted-foreground">Record not found.</div>

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            {/* Header Info */}
            <div className="p-4 rounded-2xl bg-muted/30 border border-border/50">
                <h2 className="text-2xl font-black tracking-tight">{data.student.name}</h2>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground font-medium">
                    <span>{data.student.email}</span>
                    <span>•</span>
                    <span>ID: {data.student.id}</span>
                    {data.student.reg && (
                        <>
                            <span>•</span>
                            <span className="text-primary">Reg: {data.student.reg}</span>
                        </>
                    )}
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-4 bg-muted/10 p-4 rounded-xl border border-border/40">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 sm:mb-0 w-full sm:w-auto">
                    <Filter className="h-3 w-3" /> Quick Filter
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">From</span>
                    <Input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="h-8 text-xs w-36 bg-background/50"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">To</span>
                    <Input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="h-8 text-xs w-36 bg-background/50"
                    />
                </div>
            </div>

            {/* Subject-wise Cards */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                        <BookOpen className="h-4 w-4" /> Academic Progress
                    </h3>
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {data.subjects.map((sub: any) => (
                        <Card key={sub.subjectCode} className="group relative overflow-hidden border-0 bg-gradient-to-br from-card to-muted/20 hover:shadow-lg transition-all duration-300">
                            <div className={`absolute top-0 left-0 w-1 h-full ${sub.percentage >= 75 ? "bg-green-500" : "bg-red-500"}`} />
                            <CardContent className="p-4 space-y-3">
                                <div className="flex justify-between items-start">
                                    <div className="font-bold text-sm tracking-tight truncate pr-2">{sub.subjectName}</div>
                                    <Badge variant={sub.percentage >= 75 ? "default" : "destructive"} className="text-[10px] h-5">
                                        {sub.percentage}%
                                    </Badge>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-[10px] uppercase font-black text-muted-foreground/60">
                                        <span>Attended: {sub.attended}</span>
                                        <span>Total: {sub.total}</span>
                                    </div>
                                    <Progress value={sub.percentage} className={`h-1.5 ${sub.percentage < 75 ? "bg-red-500/20" : "bg-green-500/20"}`} />
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>

            {/* Logs Table */}
            <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                    <Calendar className="h-4 w-4" /> Detailed Attendance Log
                </h3>
                <div className="rounded-2xl border border-border/50 bg-card/30 backdrop-blur-sm overflow-hidden">
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead className="text-[10px] font-bold uppercase tracking-wider">Date & Time</TableHead>
                                <TableHead className="text-[10px] font-bold uppercase tracking-wider">Subject</TableHead>
                                <TableHead className="text-[10px] font-bold uppercase tracking-wider text-center">Slot</TableHead>
                                <TableHead className="text-[10px] font-bold uppercase tracking-wider">Teacher Arrival</TableHead>
                                <TableHead className="text-[10px] font-bold uppercase tracking-wider">Status</TableHead>
                                <TableHead className="text-[10px] font-bold uppercase tracking-wider text-right">Points</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.logs.map((log: any) => (
                                <TableRow key={log.id} className="group hover:bg-muted/40 transition-colors border-border/20">
                                    <TableCell className="py-4">
                                        <div className="font-medium text-sm">{format(new Date(log.date), "MMM d, yyyy")}</div>
                                        <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                                            <Clock className="h-3 w-3" /> {log.time}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="text-sm font-semibold">{log.subject}</div>
                                        <div className="text-[10px] text-muted-foreground font-mono">{log.startTime} - {log.endTime}</div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <div className="flex flex-col items-center gap-1">
                                            <Timer className="h-4 w-4 opacity-30" />
                                            <span className="text-[10px] font-bold text-muted-foreground">{log.duration}m</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {log.teacherArrivedAt ? (
                                            <div className="flex flex-col gap-1">
                                                <div className="text-[10px] font-bold text-green-500 flex items-center gap-1">
                                                    <CheckCircle2 className="h-3 w-3" /> Arrived
                                                </div>
                                                <div className="text-[9px] font-mono text-muted-foreground">{log.teacherArrivedAt}</div>
                                            </div>
                                        ) : (
                                            <div className="text-[10px] font-bold text-muted-foreground/50 italic italic flex items-center gap-1">
                                                <AlertCircle className="h-3 w-3" /> No Data
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <div className="space-y-1">
                                            <Badge variant={log.status === 'present' ? "secondary" : "outline"} className={`text-[10px] uppercase font-black px-1.5 h-5 ${log.status === 'present' ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"}`}>
                                                {log.status === 'present' ? <CheckCircle2 className="h-2.5 w-2.5 mr-1" /> : <AlertCircle className="h-2.5 w-2.5 mr-1" />}
                                                {log.status}
                                            </Badge>
                                            {log.lateMins && (
                                                <div className="text-[9px] font-bold text-red-400 pl-1">
                                                    Late by {log.lateMins} mins
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right font-black text-primary text-sm">
                                        +{log.points}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    {data.logs.length === 0 && (
                        <div className="p-12 text-center">
                            <XCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-20" />
                            <p className="text-muted-foreground text-sm font-medium">No activity records found for this period.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
