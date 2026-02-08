"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Clock, MapPin, Users, CheckCircle, XCircle, AlertCircle, Calendar, ArrowRight } from "lucide-react"
import { RFIDScanner } from "@/components/rfid-scanner"
import { LiveAttendanceFeed } from "@/components/live-attendance-feed"
import type { Slot, AttendanceRecord, User } from "@/lib/types"
import { cn } from "@/lib/utils"
import { StudentDetailSheet } from "@/components/teacher/StudentDetailSheet"
import Link from "next/link"

export default function TeacherDashboard() {
  const { user } = useAuth()
  const [slots, setSlots] = useState<Slot[]>([])
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [students, setStudents] = useState<User[]>([])
  const [selectedSlot, setSelectedSlot] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [activeSession, setActiveSession] = useState<any>(null)
  const [isEndingSession, setIsEndingSession] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!user || user.role !== "teacher") return

    async function fetchData() {
      try {
        // Fetch all slots to find teacher's assignments
        const slotsRes = await fetch("/api/slots")
        const slotsData = await slotsRes.json()
        const teacherSlots = slotsData.filter((s: Slot) => s.teacherId === user?.id)
        setSlots(teacherSlots)

        // Fetch students (in a real app, this might be scoped by class/dept)
        const usersRes = await fetch("/api/users")
        const usersData = await usersRes.json()
        setStudents(usersData.filter((u: User) => u.role === "student"))

        // Find current or next slot
        const now = new Date()
        const currentDay = now.toLocaleDateString("en-US", { weekday: "long" })
        const currentTimeStr = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })

        const todaySlots = teacherSlots
          .filter((s: Slot) => s.day === currentDay)
          .sort((a: Slot, b: Slot) => a.startTime.localeCompare(b.startTime))

        const activeOrNext = todaySlots.find((s: Slot) => s.endTime > currentTimeStr) || todaySlots[0]

        if (activeOrNext) {
          setSelectedSlot(activeOrNext.id)
        } else if (teacherSlots.length > 0) {
          setSelectedSlot(teacherSlots[0].id)
        }

        // Fetch active session
        if (user?.id) {
          const { getActiveTeacherSession } = await import("@/app/actions/sessions")
          const session = await getActiveTeacherSession(user.id)
          setActiveSession(session)
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [user])

  useEffect(() => {
    if (!selectedSlot) return

    async function fetchAttendance() {
      try {
        const response = await fetch(`/api/attendance?slotId=${selectedSlot}`)
        const data = await response.json()
        setAttendance(data)
      } catch (error) {
        console.error("Error fetching attendance:", error)
      }
    }

    fetchAttendance()
  }, [selectedSlot])

  if (!user || user.role !== "teacher") return null

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-muted-foreground">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-lg font-medium animate-pulse">Initializing your dashboard...</p>
        </div>
      </div>
    )
  }

  const currentDay = currentTime.toLocaleDateString("en-US", { weekday: "long" })
  const currentTimeStr = currentTime.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })

  const todaySlots = slots.filter((slot) => slot.day === currentDay)
  const currentSlot = slots.find((s) => s.id === selectedSlot)

  // Dynamic stats
  const totalClasses = slots.length
  const classesToday = todaySlots.length

  // Filter students for the current slot's class/dept if possible
  // For now, using all students associated with teacher's department or classId
  const relevantStudents = students.filter(s =>
    currentSlot ? (s.classId === currentSlot.classId || s.departmentId === currentSlot.departmentId) : true
  )

  const presentCount = attendance.length
  const attendanceRate = relevantStudents.length > 0 ? Math.round((presentCount / relevantStudents.length) * 100) : 0

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground lg:text-5xl">
            Welcome back, <span className="text-primary">{user.name.split(" ")[0]}</span>
          </h1>
          <p className="text-muted-foreground text-lg mt-2 font-medium">
            {currentDay}, {currentTime.toLocaleDateString()} • {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button asChild variant="outline" className="rounded-xl shadow-sm">
            <Link href="/dashboard/teacher/schedule">
              <Calendar className="mr-2 h-4 w-4" />
              View Full Schedule
            </Link>
          </Button>
          <Button className="rounded-xl shadow-lg bg-primary hover:bg-primary/90">
            <Users className="mr-2 h-4 w-4" />
            Class Management
          </Button>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-none shadow-xl bg-gradient-to-br from-indigo-500/10 via-background to-background ring-1 ring-indigo-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Total Courses</CardTitle>
            <div className="p-2 bg-indigo-500/10 rounded-lg">
              <Users className="h-5 w-5 text-indigo-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-foreground">{totalClasses}</div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1 font-medium">
              <span className="text-indigo-500 font-bold">Active</span> across departments
            </p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl bg-gradient-to-br from-emerald-500/10 via-background to-background ring-1 ring-emerald-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Today&apos;s Load</CardTitle>
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <Clock className="h-5 w-5 text-emerald-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-foreground">{classesToday}</div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1 font-medium">
              <span className="text-emerald-500 font-bold">Scheduled</span> for {currentDay}
            </p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl bg-gradient-to-br from-amber-500/10 via-background to-background ring-1 ring-amber-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Students Present</CardTitle>
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <CheckCircle className="h-5 w-5 text-amber-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-foreground">{presentCount}</div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1 font-medium">
              of <span className="text-amber-500 font-bold">{relevantStudents.length}</span> students in class
            </p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl bg-gradient-to-br from-rose-500/10 via-background to-background ring-1 ring-rose-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Attendance Rate</CardTitle>
            <div className="p-2 bg-rose-500/10 rounded-lg">
              <AlertCircle className="h-5 w-5 text-rose-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-foreground">{attendanceRate}%</div>
            <div className="w-full bg-muted h-1.5 rounded-full mt-3 overflow-hidden">
              <div className="bg-rose-500 h-full rounded-full transition-all duration-1000" style={{ width: `${attendanceRate}%` }} />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-8">
          <Tabs defaultValue="live" className="w-full">
            <div className="flex items-center justify-between mb-4">
              <TabsList className="bg-muted/50 p-1 rounded-xl ring-1 ring-border/50">
                <TabsTrigger value="live" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm px-6">Live View</TabsTrigger>
                <TabsTrigger value="students" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm px-6">Student List</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="live" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className="grid gap-6 md:grid-cols-2">
                <RFIDScanner slotId={selectedSlot} />
                <LiveAttendanceFeed />
              </div>
            </TabsContent>

            <TabsContent value="students" className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <Card className="border-none shadow-lg overflow-hidden">
                <div className="p-0">
                  <div className="grid grid-cols-4 gap-4 px-6 py-4 bg-muted/30 text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border/50">
                    <div>Student Name</div>
                    <div>ID/RFID</div>
                    <div>Timestamp</div>
                    <div className="text-right">Status</div>
                  </div>
                  <div className="divide-y divide-border/40">
                    {relevantStudents.map((student) => {
                      const rec = attendance.find((att) => att.studentId === student.id)
                      return (
                        <div key={student.id} className="grid grid-cols-4 gap-4 px-6 py-4 items-center text-sm transition-hover hover:bg-muted/20">
                          <div className="font-bold text-foreground">
                            <StudentDetailSheet
                              studentId={student.id}
                              studentName={student.name}
                              teacherId={user?.id || ""}
                            >
                              <span className="cursor-pointer hover:text-primary transition-colors underline-offset-4 hover:underline decoration-primary/30">
                                {student.name}
                              </span>
                            </StudentDetailSheet>
                          </div>
                          <div className="font-mono text-xs text-muted-foreground">{student.rollNumber || student.rfidTag || "N/A"}</div>
                          <div className="text-xs text-muted-foreground">
                            {rec ? new Date(rec.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "—"}
                          </div>
                          <div className="flex justify-end gap-2">
                            {rec ? (
                              <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 px-3 py-1 font-bold rounded-full">
                                {rec.status.toUpperCase()}
                              </Badge>
                            ) : (
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-2 text-[10px] font-bold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                  onClick={async () => {
                                    if (!selectedSlot) return
                                    const { manualMarkAttendance } = await import("@/app/actions/attendance")
                                    const res = await manualMarkAttendance({
                                      studentId: student.id,
                                      slotId: selectedSlot,
                                      status: "present"
                                    })
                                    if (res.success) {
                                      // Refresh attendance list
                                      const response = await fetch(`/api/attendance?slotId=${selectedSlot}`)
                                      const data = await response.json()
                                      setAttendance(data)
                                    }
                                  }}
                                >
                                  PRESENT
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-2 text-[10px] font-bold text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                  onClick={async () => {
                                    if (!selectedSlot) return
                                    const { manualMarkAttendance } = await import("@/app/actions/attendance")
                                    const res = await manualMarkAttendance({
                                      studentId: student.id,
                                      slotId: selectedSlot,
                                      status: "late"
                                    })
                                    if (res.success) {
                                      // Refresh attendance list
                                      const response = await fetch(`/api/attendance?slotId=${selectedSlot}`)
                                      const data = await response.json()
                                      setAttendance(data)
                                    }
                                  }}
                                >
                                  LATE
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                    {relevantStudents.length === 0 && (
                      <div className="p-12 text-center text-muted-foreground italic">
                        No students found for this class slot.
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-6">
          <Card className="border-none shadow-xl bg-card overflow-hidden ring-1 ring-border/50">
            <CardHeader className="bg-muted/10 border-b border-border/50">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-bold">Class in Progress</CardTitle>
                <Badge className="bg-rose-500 animate-pulse">LIVE</Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {currentSlot ? (
                <div className="space-y-6">
                  <div className="flex items-start gap-4 p-4 rounded-2xl bg-primary/5 ring-1 ring-primary/10">
                    <div className="p-3 bg-primary rounded-xl">
                      <Clock className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-black text-xl leading-tight">{currentSlot.courseName}</h3>
                      <p className="text-muted-foreground font-mono text-sm">{currentSlot.courseCode}</p>
                    </div>
                  </div>

                  <div className="grid gap-4 py-2">
                    <div className="flex items-center gap-3 text-sm font-medium">
                      <Clock className="h-4 w-4 text-primary" />
                      <span>{currentSlot.startTime} - {currentSlot.endTime}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm font-medium">
                      <MapPin className="h-4 w-4 text-primary" />
                      <span>{currentSlot.room}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm font-medium">
                      <Users className="h-4 w-4 text-primary" />
                      <span>Expected: {relevantStudents.length} Students</span>
                    </div>
                  </div>

                  <Button
                    className={cn(
                      "w-full rounded-xl py-6 font-bold text-lg group transition-all",
                      activeSession ? "bg-rose-600 text-white hover:bg-rose-700" : "bg-foreground text-background hover:bg-foreground/90"
                    )}
                    disabled={isEndingSession || !activeSession}
                    onClick={async () => {
                      if (!activeSession) return
                      setIsEndingSession(true)
                      try {
                        const { endActiveSession } = await import("@/app/actions/sessions")
                        const res = await endActiveSession(activeSession.sessionId)
                        if (res.success) {
                          setActiveSession(null)
                        }
                      } finally {
                        setIsEndingSession(false)
                      }
                    }}
                  >
                    {isEndingSession ? "Ending..." : activeSession ? "End Session Now" : "End Session"}
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-muted-foreground font-medium">No active class at this time</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl bg-card overflow-hidden ring-1 ring-border/50">
            <CardHeader className="bg-muted/10 border-b border-border/50">
              <CardTitle className="text-lg font-bold">Today&apos;s Schedule</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 px-2">
              <div className="space-y-2">
                {todaySlots.length > 0 ? todaySlots.map((slot) => (
                  <button
                    key={slot.id}
                    onClick={() => setSelectedSlot(slot.id)}
                    className={cn(
                      "w-full text-left p-4 rounded-xl transition-all border border-transparent",
                      selectedSlot === slot.id
                        ? "bg-primary/10 border-primary/20 scale-[1.02] shadow-sm"
                        : "hover:bg-muted/50"
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-black text-primary uppercase tracking-tighter">{slot.startTime}</span>
                      {currentTimeStr >= slot.startTime && currentTimeStr <= slot.endTime && (
                        <Badge className="h-2 w-2 p-0 rounded-full bg-rose-500 animate-ping" />
                      )}
                    </div>
                    <h4 className="font-bold text-sm truncate">{slot.courseName}</h4>
                    <p className="text-[10px] text-muted-foreground font-medium uppercase">{slot.room}</p>
                  </button>
                )) : (
                  <p className="text-center py-4 text-sm text-muted-foreground italic">No classes today</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
