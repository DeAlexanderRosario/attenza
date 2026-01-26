"use client"

import { useState, useEffect, useMemo } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, Filter, Download, User as UserIcon, Building2, GraduationCap, Clock, RefreshCw, XCircle } from "lucide-react"
import { useSocket } from "@/components/socket-provider"
import { StudentAttendanceDetail } from "./student-attendance-detail"
import { TeacherAttendanceDetail } from "./teacher-attendance-detail"
import { getStudentList, getTeacherList } from "@/app/actions/attendance"
import { getClasses } from "@/app/actions/classes"
import { format } from "date-fns"

interface AttendanceDashboardClientProps {
    initialLogs: any[]
    departments: any[]
}

export function AttendanceDashboardClient({ initialLogs, departments }: AttendanceDashboardClientProps) {
    const { socket } = useSocket()
    const [activeTab, setActiveTab] = useState("overview")

    // Live Activity State
    const [liveLogs, setLiveLogs] = useState(initialLogs)

    // Filtering State
    const [selectedDept, setSelectedDept] = useState("all")
    const [selectedClass, setSelectedClass] = useState("all")
    const [searchQuery, setSearchQuery] = useState("")
    const [availableClasses, setAvailableClasses] = useState<any[]>([])
    const [students, setStudents] = useState<any[]>([])
    const [loadingStudents, setLoadingStudents] = useState(false)

    // Detailed View State
    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)

    // Teacher Reporting State
    const [teachers, setTeachers] = useState<any[]>([])
    const [loadingTeachers, setLoadingTeachers] = useState(false)
    const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null)
    const [teacherSearchQuery, setTeacherSearchQuery] = useState("")
    const [selectedTeacherDept, setSelectedTeacherDept] = useState("all")

    // Socket Integration
    useEffect(() => {
        if (!socket) return

        const handleNewActivity = (activity: any) => {
            console.log("[Socket] New activity received:", activity)
            setLiveLogs(prev => [activity, ...prev].slice(0, 50))
        }

        socket.on("new_activity", handleNewActivity)
        return () => {
            socket.off("new_activity", handleNewActivity)
        }
    }, [socket])

    // Load Classes when Dept changes
    useEffect(() => {
        if (selectedDept !== "all") {
            getClasses(selectedDept).then(setAvailableClasses)
        } else {
            setAvailableClasses([])
        }
        setSelectedClass("all")
    }, [selectedDept])

    // Load Students for Reports
    useEffect(() => {
        if (activeTab === "reports") {
            fetchStudents()
        }
    }, [activeTab, selectedDept, selectedClass, searchQuery])

    // Load Teachers for Reports
    useEffect(() => {
        if (activeTab === "teachers") {
            fetchTeachers()
        }
    }, [activeTab, selectedTeacherDept, teacherSearchQuery])

    async function fetchStudents() {
        setLoadingStudents(true)
        try {
            const list = await getStudentList({
                departmentId: selectedDept,
                classId: selectedClass,
                query: searchQuery
            })
            setStudents(list)
        } catch (e) {
            console.error("Failed to fetch students:", e)
        } finally {
            setLoadingStudents(false)
        }
    }

    async function fetchTeachers() {
        setLoadingTeachers(true)
        try {
            const list = await getTeacherList({
                departmentId: selectedTeacherDept,
                query: teacherSearchQuery
            })
            setTeachers(list)
        } catch (e) {
            console.error("Failed to fetch teachers:", e)
        } finally {
            setLoadingTeachers(false)
        }
    }


    return (
        <div className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <div className="flex items-center justify-between mb-4">
                    <TabsList className="bg-muted/50 p-1 rounded-xl">
                        <TabsTrigger value="overview" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                            Overview
                        </TabsTrigger>
                        <TabsTrigger value="reports" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                            Student Reports
                        </TabsTrigger>
                        <TabsTrigger value="teachers" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                            Teacher Reports
                        </TabsTrigger>
                        <TabsTrigger value="analysis" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                            Analysis
                        </TabsTrigger>
                    </TabsList>

                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`${socket ? "text-green-500 border-green-500/50" : "text-red-500 border-red-500/50"} bg-background/50`}>
                            {socket ? "● Live Connected" : "○ Disconnected"}
                        </Badge>
                    </div>
                </div>

                <TabsContent value="overview" className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                    <Card className="bg-card/30 backdrop-blur-md border border-border/50">
                        <CardHeader>
                            <CardTitle>Live Activity Stream</CardTitle>
                            <CardDescription>Real-time updates from campus RFID readers.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>User</TableHead>
                                        <TableHead>Action</TableHead>
                                        <TableHead>Time</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {liveLogs.map((log, idx) => (
                                        <TableRow key={log.id || idx} className="hover:bg-muted/20">
                                            <TableCell className="font-medium">{log.user}</TableCell>
                                            <TableCell>{log.action}</TableCell>
                                            <TableCell>{log.time}</TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={log.status === "success" ? "default" : "secondary"}
                                                    className={
                                                        log.status === "success" ? "bg-green-500 hover:bg-green-600" :
                                                            log.status === "RE_VERIFICATION" ? "bg-purple-600 hover:bg-purple-700 animate-pulse border-none text-white shadow-sm" :
                                                                "text-yellow-500 border-yellow-500/50"
                                                    }
                                                >
                                                    {log.status === "success" ? "Present" :
                                                        log.status === "RE_VERIFICATION" ? "Re-Check" : "Late"}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="reports" className="space-y-0 animate-in fade-in slide-in-from-bottom-2">
                    {/* Master-Detail Split View Container */}
                    <div className="flex h-[750px] gap-0 overflow-hidden rounded-3xl border border-border/50 bg-card/10 backdrop-blur-xl shadow-2xl">

                        {/* LEFT: MASTER LIST SECTION (Sidebar) */}
                        <div className="w-[320px] flex flex-col border-r border-border/50 bg-muted/5">
                            <div className="p-4 space-y-4 border-b border-border/50">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/70">Student Directory</h3>
                                    <Badge variant="outline" className="text-[9px] font-bold border-primary/20 bg-primary/5">{students.length}</Badge>
                                </div>
                                <div className="space-y-2">
                                    <div className="grid grid-cols-2 gap-2">
                                        <Select value={selectedDept} onValueChange={setSelectedDept}>
                                            <SelectTrigger className="h-8 text-[10px] bg-background/50 border-border/40">
                                                <SelectValue placeholder="Dept" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Depts</SelectItem>
                                                {departments.map((d: any) => (
                                                    <SelectItem key={d.id} value={d.id} className="text-[10px]">{d.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <Select value={selectedClass} onValueChange={setSelectedClass} disabled={selectedDept === "all"}>
                                            <SelectTrigger className="h-8 text-[10px] bg-background/50 border-border/40">
                                                <SelectValue placeholder="Class" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Classes</SelectItem>
                                                {availableClasses.map((c: any) => (
                                                    <SelectItem key={c.id} value={c.id} className="text-[10px]">{c.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="relative group">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                        <Input
                                            placeholder="Find student..."
                                            className="pl-9 h-8 text-[11px] bg-background/50 border-border/40 focus-visible:ring-1 focus-visible:ring-primary/30"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>

                            <ScrollArea className="flex-1">
                                <div className="p-3 space-y-1">
                                    {loadingStudents ? (
                                        <div className="p-12 text-center">
                                            <RefreshCw className="h-5 w-5 animate-spin mx-auto text-primary opacity-50" />
                                            <p className="text-[10px] mt-2 text-muted-foreground font-medium uppercase tracking-widest">Searching</p>
                                        </div>
                                    ) : students.length === 0 ? (
                                        <div className="p-12 text-center text-muted-foreground">
                                            <UserIcon className="h-8 w-8 mx-auto opacity-10 mb-2" />
                                            <p className="text-[10px] font-medium uppercase tracking-widest">No Matches</p>
                                        </div>
                                    ) : (
                                        students.map((s) => (
                                            <div
                                                key={s.id}
                                                onClick={() => setSelectedStudentId(s.id)}
                                                className={`p-3 rounded-2xl cursor-pointer transition-all duration-300 group relative border ${selectedStudentId === s.id
                                                    ? "bg-primary border-primary shadow-lg shadow-primary/20 -translate-y-[1px]"
                                                    : "hover:bg-primary/5 hover:border-primary/20 border-transparent"
                                                    }`}
                                            >
                                                {selectedStudentId === s.id && (
                                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-white rounded-full ml-1" />
                                                )}
                                                <div className={`font-bold text-xs tracking-tight leading-none ${selectedStudentId === s.id ? "text-primary-foreground" : "text-foreground group-hover:text-primary"}`}>
                                                    {s.name}
                                                </div>
                                                <div className="flex items-center justify-between mt-2">
                                                    <span className={`text-[10px] font-black uppercase tracking-tighter ${selectedStudentId === s.id ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                                                        {s.registerNumber || "NO-REG"}
                                                    </span>
                                                    <Badge className={`text-[8px] h-4 font-bold border-0 ${selectedStudentId === s.id ? "bg-white/20 text-white" : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"}`}>
                                                        {s.rfidTag}
                                                    </Badge>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </ScrollArea>
                        </div>

                        {/* RIGHT: DETAIL AREA SECTION */}
                        <div className="flex-1 bg-background/20 relative flex flex-col overflow-hidden">
                            {selectedStudentId ? (
                                <ScrollArea className="flex-1 scroll-smooth">
                                    <div className="p-6 md:p-10 animate-in fade-in slide-in-from-right-4 duration-500">
                                        <StudentAttendanceDetail userId={selectedStudentId} />
                                    </div>
                                </ScrollArea>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center text-center p-12 space-y-6">
                                    <div className="p-8 rounded-full bg-primary/5 border border-primary/10 relative">
                                        <UserIcon className="h-16 w-16 text-primary/20" />
                                        <div className="absolute -bottom-1 -right-1 p-2 rounded-full bg-background border border-border shadow-xl">
                                            <Search className="h-4 w-4 text-primary animate-pulse" />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <h4 className="text-xl font-black tracking-tight uppercase">Select a Student</h4>
                                        <p className="text-xs text-muted-foreground max-w-[280px] mx-auto font-medium leading-relaxed">
                                            Choose a profile from the directory to analyze detailed performance, subject breakdown, and history.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="teachers" className="space-y-0 animate-in fade-in slide-in-from-bottom-2">
                    {/* Master-Detail Split View for Teachers */}
                    <div className="flex h-[750px] gap-0 overflow-hidden rounded-3xl border border-border/50 bg-card/10 backdrop-blur-xl shadow-2xl">

                        {/* LEFT: MASTER LIST SECTION (Sidebar) */}
                        <div className="w-[320px] flex flex-col border-r border-border/50 bg-muted/5">
                            <div className="p-4 space-y-4 border-b border-border/50">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/70">Faculty Directory</h3>
                                    <Badge variant="outline" className="text-[9px] font-bold border-primary/20 bg-primary/5">{teachers.length}</Badge>
                                </div>
                                <div className="space-y-2">
                                    <Select value={selectedTeacherDept} onValueChange={setSelectedTeacherDept}>
                                        <SelectTrigger className="h-8 text-[10px] bg-background/50 border-border/40">
                                            <SelectValue placeholder="All Departments" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Departments</SelectItem>
                                            {departments.map((d: any) => (
                                                <SelectItem key={d.id} value={d.id} className="text-[10px]">{d.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <div className="relative group">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                        <Input
                                            placeholder="Search faculty..."
                                            className="pl-9 h-8 text-[11px] bg-background/50 border-border/40 focus-visible:ring-1 focus-visible:ring-primary/30"
                                            value={teacherSearchQuery}
                                            onChange={(e) => setTeacherSearchQuery(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>

                            <ScrollArea className="flex-1">
                                <div className="p-3 space-y-1">
                                    {loadingTeachers ? (
                                        <div className="p-12 text-center">
                                            <RefreshCw className="h-5 w-5 animate-spin mx-auto text-primary opacity-50" />
                                            <p className="text-[10px] mt-2 text-muted-foreground font-medium uppercase tracking-widest">Loading Faculty</p>
                                        </div>
                                    ) : teachers.length === 0 ? (
                                        <div className="p-12 text-center text-muted-foreground">
                                            <XCircle className="h-8 w-8 mx-auto opacity-10 mb-2" />
                                            <p className="text-[10px] font-medium uppercase tracking-widest">No Results</p>
                                        </div>
                                    ) : (
                                        teachers.map((t) => (
                                            <div
                                                key={t.id}
                                                onClick={() => setSelectedTeacherId(t.id)}
                                                className={`p-3 rounded-2xl cursor-pointer transition-all duration-300 group relative border ${selectedTeacherId === t.id
                                                    ? "bg-primary border-primary shadow-lg shadow-primary/20 -translate-y-[1px]"
                                                    : "hover:bg-primary/5 hover:border-primary/20 border-transparent"
                                                    }`}
                                            >
                                                {selectedTeacherId === t.id && (
                                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-white rounded-full ml-1" />
                                                )}
                                                <div className={`font-bold text-xs tracking-tight leading-none ${selectedTeacherId === t.id ? "text-primary-foreground" : "text-foreground group-hover:text-primary"}`}>
                                                    {t.name}
                                                </div>
                                                <div className="flex items-center justify-between mt-2">
                                                    <span className={`text-[10px] font-black uppercase tracking-tighter ${selectedTeacherId === t.id ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                                                        {t.department || "No Dept"}
                                                    </span>
                                                    <Badge className={`text-[8px] h-4 font-bold border-0 ${selectedTeacherId === t.id ? "bg-white/20 text-white" : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"}`}>
                                                        Profile
                                                    </Badge>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </ScrollArea>
                        </div>

                        {/* RIGHT: DETAIL AREA SECTION */}
                        <div className="flex-1 bg-background/20 relative flex flex-col overflow-hidden">
                            {selectedTeacherId ? (
                                <ScrollArea className="flex-1 scroll-smooth">
                                    <div className="p-6 md:p-10 animate-in fade-in slide-in-from-right-4 duration-500">
                                        <TeacherAttendanceDetail teacherId={selectedTeacherId} />
                                    </div>
                                </ScrollArea>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center text-center p-12 space-y-6">
                                    <div className="p-8 rounded-full bg-primary/5 border border-primary/10 relative">
                                        <UserIcon className="h-16 w-16 text-primary/20" />
                                        <div className="absolute -bottom-1 -right-1 p-2 rounded-full bg-background border border-border shadow-xl">
                                            <Clock className="h-4 w-4 text-primary animate-pulse" />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <h4 className="text-xl font-black tracking-tight uppercase">Analyze Faculty Performance</h4>
                                        <p className="text-xs text-muted-foreground max-w-[280px] mx-auto font-medium leading-relaxed">
                                            Select a teacher to review their session adherence, punctuality metrics, and student distribution.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="analysis">
                    <div className="p-8 text-center text-muted-foreground">Advanced trend analysis and visual charts coming soon.</div>
                </TabsContent>
            </Tabs>
        </div>
    )
}
