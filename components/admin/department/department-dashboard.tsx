"use client"

import * as React from "react"
import {
    Users,
    BookOpen,
    Calendar,
    TrendingUp,
    MoreHorizontal,
    Clock,
    GraduationCap,
    Building2,
    ArrowLeft
} from "lucide-react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

// UI Components
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// Types
import { Department, Class, ClassSlot, TimetableEntry } from "@/lib/types"

// --- COLOR PSYCHOLOGY CONFIG ---
// Blue: Trust, Intelligence (Main Header)
// Indigo: Authority (Faculty)
// Emerald: Growth, Stability (Students/Classes)
// Slate: Neutrality (Structure)

export function DepartmentDashboard({
    department,
    stats,
    timetable,
    classes,
    slots
}: {
    department: Department
    stats: any
    timetable: TimetableEntry[]
    classes: Class[]
    slots: ClassSlot[]
}) {
    const router = useRouter()
    const [activeTab, setActiveTab] = React.useState("overview")

    return (
        <div className="flex flex-col h-full bg-slate-50/30 min-h-screen">

            {/* --- TOP NAVIGATION BAR --- */}
            <div className="border-b bg-white px-6 py-4 flex items-center justify-between sticky top-0 z-30 shadow-sm">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-muted-foreground">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl font-bold tracking-tight text-slate-900">{department.name}</h1>
                            <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-100">
                                {department.code}
                            </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">Academic Department Management</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline">Edit Profile</Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon"><MoreHorizontal className="h-5 w-5" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem className="text-red-600">Deactivate Department</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            <div className="flex-1 space-y-6 p-6 max-w-[1600px] w-full mx-auto">

                {/* --- STATS OVERVIEW (Color Coded) --- */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <StatCard
                        title="Total Students"
                        value={stats.totalStudents}
                        icon={GraduationCap}
                        trend="+12% from last year"
                        color="text-blue-600"
                        bg="bg-blue-50"
                    />
                    <StatCard
                        title="Faculty Members"
                        value={stats.totalTeachers}
                        icon={Users}
                        trend="Active Staff"
                        color="text-indigo-600"
                        bg="bg-indigo-50"
                    />
                    <StatCard
                        title="Active Classes"
                        value={classes.length}
                        icon={BookOpen}
                        trend="Currently Running"
                        color="text-emerald-600"
                        bg="bg-emerald-50"
                    />
                    <StatCard
                        title="Weekly Sessions"
                        value={timetable.length}
                        icon={Clock}
                        trend="Scheduled Hours"
                        color="text-amber-600"
                        bg="bg-amber-50"
                    />
                </div>

                {/* --- MAIN CONTENT TABS --- */}
                <Tabs defaultValue="timetable" className="space-y-4" onValueChange={setActiveTab}>
                    <TabsList className="bg-white border p-1 h-12 w-full justify-start rounded-lg shadow-sm">
                        <TabsTrigger value="overview" className="h-10">Overview</TabsTrigger>
                        <TabsTrigger value="timetable" className="h-10">Master Timetable</TabsTrigger>
                        <TabsTrigger value="classes" className="h-10">Classes & Sections</TabsTrigger>
                    </TabsList>

                    {/* TIMETABLE TAB */}
                    <TabsContent value="timetable" className="space-y-4 animate-in fade-in-50 duration-500">
                        <DepartmentTimetableGrid
                            classes={classes}
                            slots={slots}
                            fullTimetable={timetable}
                        />
                    </TabsContent>

                    {/* CLASSES TAB */}
                    <TabsContent value="classes">
                        <Card>
                            <CardHeader>
                                <CardTitle>Class Management</CardTitle>
                                <CardDescription>Manage sections and student groups.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {classes.map(c => (
                                        <div key={c.id} className="p-4 rounded-lg border bg-white flex items-center justify-between hover:border-blue-300 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500">
                                                    {c.name.substring(0, 2)}
                                                </div>
                                                <div>
                                                    <div className="font-semibold">{c.name}</div>
                                                    <div className="text-xs text-muted-foreground">{department.code} • {c.semester || 1}st Sem</div>
                                                </div>
                                            </div>
                                            <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="overview">
                        <Card className="h-[400px] flex items-center justify-center text-muted-foreground border-dashed">
                            Overview Charts Placeholder
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    )
}

// --- SUB COMPONENT: STAT CARD ---
function StatCard({ title, value, icon: Icon, trend, color, bg }: any) {
    return (
        <Card className="border-l-4 shadow-sm hover:shadow-md transition-all duration-200" style={{ borderLeftColor: 'currentColor' }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
                <div className={cn("p-2 rounded-full", bg)}>
                    <Icon className={cn("h-4 w-4", color)} />
                </div>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold text-slate-800">{value}</div>
                <p className="text-xs text-muted-foreground mt-1">{trend}</p>
            </CardContent>
        </Card>
    )
}

// --- SUB COMPONENT: THE INTERACTIVE GRID ---
function DepartmentTimetableGrid({
    classes,
    slots,
    fullTimetable
}: {
    classes: Class[],
    slots: ClassSlot[],
    fullTimetable: TimetableEntry[]
}) {
    const [selectedClassId, setSelectedClassId] = React.useState<string>(classes[0]?.id || "")
    const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

    // Sort slots by time
    const sortedSlots = [...slots].sort((a, b) => a.startTime.localeCompare(b.startTime))

    // Filter timetable for selected class
    const classTimetable = React.useMemo(() => {
        return fullTimetable.filter(t => t.classId === selectedClassId)
    }, [fullTimetable, selectedClassId])

    const getEntry = (day: string, slotId: string) => classTimetable.find(t => t.dayOfWeek === day && t.classSlotId === slotId)

    return (
        <Card className="border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b bg-slate-50/50">
                <div>
                    <CardTitle>Department Schedule</CardTitle>
                    <CardDescription>View weekly timetable by class section.</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                    <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                        <SelectTrigger className="w-[200px] bg-white">
                            <BookOpen className="mr-2 h-4 w-4 text-muted-foreground" />
                            <SelectValue placeholder="Select Class" />
                        </SelectTrigger>
                        <SelectContent>
                            {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            </CardHeader>

            <CardContent className="p-0">
                <ScrollArea className="w-full whitespace-nowrap">
                    <div className="flex flex-col min-w-[1000px]">

                        {/* HEADER ROW */}
                        <div className="flex border-b">
                            <div className="w-[100px] flex-none p-3 text-xs font-bold uppercase text-muted-foreground bg-slate-50 border-r flex items-center justify-center">
                                Day / Time
                            </div>
                            {sortedSlots.map(slot => (
                                <div key={slot.id} className="flex-1 min-w-[140px] p-2 text-center border-r last:border-r-0 flex flex-col items-center justify-center bg-slate-50/30">
                                    <span className="font-semibold text-xs text-slate-700">{slot.startTime}</span>
                                    <span className="text-[10px] text-muted-foreground">{slot.endTime}</span>
                                </div>
                            ))}
                        </div>

                        {/* BODY ROWS */}
                        {DAYS.map(day => (
                            <div key={day} className="flex border-b last:border-b-0 hover:bg-slate-50/40 transition-colors">
                                <div className="w-[100px] flex-none p-4 text-sm font-semibold text-muted-foreground border-r flex items-center justify-center bg-white">
                                    {day.substring(0, 3)}
                                </div>
                                {sortedSlots.map(slot => {
                                    const entry = getEntry(day, slot.id)
                                    const isBreak = slot.type !== 'CLASS'

                                    return (
                                        <div key={slot.id} className={cn(
                                            "flex-1 min-w-[140px] min-h-[100px] border-r last:border-r-0 p-1.5",
                                            isBreak ? "bg-slate-50/50 pattern-diagonal-lines" : "bg-white"
                                        )}>
                                            {isBreak ? (
                                                <div className="h-full flex flex-col items-center justify-center opacity-30 text-slate-400">
                                                    <div className="text-[9px] font-bold tracking-widest uppercase">{slot.type}</div>
                                                </div>
                                            ) : (
                                                entry ? (
                                                    <div className="h-full w-full rounded border-l-4 bg-blue-50/30 border-blue-500 p-2 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                                                        <div>
                                                            <div className="flex justify-between items-start mb-1">
                                                                <span className="text-[10px] font-mono font-semibold text-slate-500 bg-white px-1 rounded border">
                                                                    {entry.subjectCode}
                                                                </span>
                                                            </div>
                                                            <div className="text-xs font-bold text-blue-900 line-clamp-2" title={entry.subjectName}>
                                                                {entry.subjectName}
                                                            </div>
                                                        </div>
                                                        <div className="text-[10px] font-medium text-slate-600 flex items-center gap-1 mt-2">
                                                            <Users className="h-3 w-3" />
                                                            {/* In real app, fetch teacher name or map it */}
                                                            Faculty (ID: {entry.teacherId.substring(0, 4)})
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="h-full w-full rounded border border-dashed border-slate-200 flex items-center justify-center text-[10px] text-slate-300">
                                                        Free
                                                    </div>
                                                )
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        ))}
                    </div>
                    <ScrollBar orientation="horizontal" />
                </ScrollArea>
            </CardContent>
        </Card>
    )
}