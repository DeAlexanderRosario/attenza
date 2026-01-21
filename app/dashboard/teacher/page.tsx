"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { Navigation } from "@/components/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Clock, MapPin, Users, CheckCircle, XCircle, AlertCircle, Download } from "lucide-react"
import { RFIDScanner } from "@/components/rfid-scanner"
import { LiveAttendanceFeed } from "@/components/live-attendance-feed"
import type { Slot, AttendanceRecord, User } from "@/lib/types"

export default function TeacherDashboard() {
  const { user } = useAuth()
  const [slots, setSlots] = useState<Slot[]>([])
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [students, setStudents] = useState<User[]>([])
  const [selectedSlot, setSelectedSlot] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!user || user.role !== "teacher") return

    async function fetchData() {
      try {
        const [slotsRes, usersRes] = await Promise.all([
          fetch(`/api/slots?department=${user.department}`),
          fetch("/api/users"),
        ])

        const [slotsData, usersData] = await Promise.all([slotsRes.json(), usersRes.json()])

        const teacherSlots = slotsData.filter((s: Slot) => s.teacherId === user.id)
        const studentUsers = usersData.filter((u: User) => u.role === "student")

        setSlots(teacherSlots)
        setStudents(studentUsers)

        if (teacherSlots.length > 0) {
          setSelectedSlot(teacherSlots[0].id)

          // Fetch attendance for first slot
          const attendanceRes = await fetch(`/api/attendance?slotId=${teacherSlots[0].id}`)
          const attendanceData = await attendanceRes.json()
          setAttendance(attendanceData)
        }
      } catch (error) {
        console.error("[v0] Error fetching data:", error)
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
        console.error("[v0] Error fetching attendance:", error)
      }
    }

    fetchAttendance()
  }, [selectedSlot])

  if (!user || user.role !== "teacher") {
    return null
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container px-4 py-6">
          <div className="text-center">Loading...</div>
        </main>
      </div>
    )
  }

  const currentSlot = slots.find((s) => s.id === selectedSlot)
  const todaySlots = slots.filter((slot) => slot.day === "Monday")
  const totalStudents = students.length
  const presentToday = attendance.length
  const attendanceRate = totalStudents > 0 ? Math.round((presentToday / totalStudents) * 100) : 0

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container px-4 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground text-balance">Teacher Dashboard</h1>
          <p className="text-muted-foreground">Monitor attendance and manage your classes</p>
        </div>

        <div className="grid gap-6 md:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Classes</CardTitle>
              <Users className="h-4 w-4 text-chart-1" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{slots.length}</div>
              <p className="text-xs text-muted-foreground">Active courses</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Today&apos;s Classes</CardTitle>
              <Clock className="h-4 w-4 text-chart-2" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{todaySlots.length}</div>
              <p className="text-xs text-muted-foreground">Scheduled</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Students Present</CardTitle>
              <CheckCircle className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{presentToday}</div>
              <p className="text-xs text-muted-foreground">of {totalStudents} students</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Attendance Rate</CardTitle>
              <AlertCircle className="h-4 w-4 text-chart-3" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{attendanceRate}%</div>
              <p className="text-xs text-muted-foreground">Today&apos;s average</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="live" className="space-y-6">
          <TabsList>
            <TabsTrigger value="live">Live Tracking</TabsTrigger>
            <TabsTrigger value="schedule">My Schedule</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="live" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <RFIDScanner slotId={selectedSlot} />
              <LiveAttendanceFeed />
            </div>
            {currentSlot && (
              <div className="mb-6 rounded-lg border border-border bg-muted/30 p-4">
                <h3 className="mb-2 font-semibold text-foreground">{currentSlot.courseName}</h3>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {currentSlot.startTime} - {currentSlot.endTime}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {currentSlot.room}
                  </span>
                  <Badge variant="default" className="bg-success text-success-foreground">
                    Active
                  </Badge>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <div className="grid grid-cols-4 gap-4 border-b border-border pb-2 text-sm font-medium text-muted-foreground">
                <div>Student Name</div>
                <div>RFID Tag</div>
                <div>Time</div>
                <div>Status</div>
              </div>
              {students.map((student) => {
                const attendanceRecord = attendance.find((att) => att.studentId === student.id)
                return (
                  <div key={student.id} className="grid grid-cols-4 gap-4 rounded-lg border border-border p-3 text-sm">
                    <div className="font-medium text-foreground">{student.name}</div>
                    <div className="text-muted-foreground">{student.rfidTag || "N/A"}</div>
                    <div className="text-muted-foreground">
                      {attendanceRecord ? new Date(attendanceRecord.timestamp).toLocaleTimeString() : "-"}
                    </div>
                    <div>
                      {attendanceRecord ? (
                        <Badge variant="default" className="bg-success text-success-foreground">
                          <CheckCircle className="mr-1 h-3 w-3" />
                          Present
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-muted text-muted-foreground">
                          <XCircle className="mr-1 h-3 w-3" />
                          Absent
                        </Badge>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </TabsContent>

          <TabsContent value="schedule" className="space-y-4">
            {slots.map((slot) => (
              <Card key={slot.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-foreground">{slot.courseName}</CardTitle>
                      <CardDescription>
                        {slot.courseCode} • {slot.day}
                      </CardDescription>
                    </div>
                    <Badge variant={slot.isActive ? "default" : "secondary"}>
                      {slot.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-foreground">
                          {slot.startTime} - {slot.endTime}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="text-foreground">{slot.room}</span>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Department: </span>
                        <span className="text-foreground">{slot.department}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Year/Semester: </span>
                        <span className="text-foreground">
                          {slot.year}/{slot.semester}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-foreground">Generate Reports</CardTitle>
                <CardDescription>Download attendance reports for your classes</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <Button variant="outline" className="justify-start bg-transparent">
                    <Download className="mr-2 h-4 w-4" />
                    Weekly Report
                  </Button>
                  <Button variant="outline" className="justify-start bg-transparent">
                    <Download className="mr-2 h-4 w-4" />
                    Monthly Report
                  </Button>
                  <Button variant="outline" className="justify-start bg-transparent">
                    <Download className="mr-2 h-4 w-4" />
                    Custom Report
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
