"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Clock } from "lucide-react"
import type { AttendanceRecord, User } from "@/lib/types"

export function LiveAttendanceFeed() {
  const [entries, setEntries] = useState<Array<AttendanceRecord & { studentName: string }>>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchRecentAttendance() {
      try {
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        const [attendanceRes, usersRes] = await Promise.all([
          fetch(`/api/attendance?startDate=${today.toISOString()}`),
          fetch("/api/users"),
        ])

        const [attendanceData, usersData] = await Promise.all([attendanceRes.json(), usersRes.json()])

        // Map attendance records to include student names
        const enrichedEntries = attendanceData
          .map((record: AttendanceRecord) => {
            const student = usersData.find((u: User) => u.id === record.studentId)
            return {
              ...record,
              studentName: student?.name || "Unknown Student",
            }
          })
          .slice(0, 10) // Show last 10 entries

        setEntries(enrichedEntries)
      } catch (error) {
        console.error("[v0] Error fetching attendance:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchRecentAttendance()

    // Poll for new entries every 10 seconds
    const interval = setInterval(fetchRecentAttendance, 10000)
    return () => clearInterval(interval)
  }, [])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-foreground">Live Attendance Feed</CardTitle>
        <CardDescription>Real-time student check-ins</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {isLoading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Loading attendance records...</div>
          ) : entries.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">No attendance records today.</div>
          ) : (
            entries.map((entry) => (
              <div key={entry.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                    {entry.studentName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{entry.studentName}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{new Date(entry.timestamp).toLocaleTimeString()}</span>
                    <span>•</span>
                    <span>{entry.rfidTag}</span>
                  </div>
                </div>
                <Badge
                  variant="default"
                  className={
                    entry.status === "present"
                      ? "bg-success text-success-foreground"
                      : "bg-warning text-warning-foreground"
                  }
                >
                  {entry.status === "present" ? "On Time" : "Late"}
                </Badge>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
