"use client"

import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, MapPin, Trophy, Target, Flame, TrendingUp } from "lucide-react"
import { useEffect, useState } from "react"
import type { Slot, AttendanceRecord, LeaderboardEntry, Achievement } from "@/lib/types"
import { Skeleton } from "@/components/ui/skeleton"
import { getStudentDashboardData } from "@/app/actions/student"
import { LeaderboardContainer } from "@/components/student/leaderboard-container"

export default function StudentDashboard() {
  const { user } = useAuth()
  const [slots, setSlots] = useState<Slot[]>([])
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [stats, setStats] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user || user.role !== "student") return

    async function fetchData() {
      try {
        setIsLoading(true)
        setError(null)

        const dashboardData = await getStudentDashboardData()

        setSlots(dashboardData.todaySlots)
        setAttendance(dashboardData.todayAttendance)
        setStats(dashboardData.stats)
        setLeaderboard((dashboardData as any).leaderboard || [])

        // Fetch achievements separately
        const achievementsRes = await fetch("/api/achievements")
        const achievementsData = await achievementsRes.json()
        setAchievements(achievementsData || [])

      } catch (error) {
        console.error("[v0] Error fetching data:", error)
        setError("Failed to load dashboard data")
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [user])

  if (!user || user.role !== "student") {
    return null
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="mb-6 space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-6 md:grid-cols-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Error Loading Dashboard</CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const totalSlots = stats?.total || 0
  const attendanceRate = stats?.overall || 0
  const currentStreak = stats?.streak || 0
  const todaySlots = slots
  const studentRank = leaderboard.find((entry) => entry.studentId === user.id)

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground text-balance">Welcome back, {user.name}!</h1>
        <p className="text-muted-foreground">Track your attendance and climb the leaderboard</p>
      </div>

      <div className="grid gap-6 md:grid-cols-4 mb-6">
        <Card className="transition-all hover:shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Points</CardTitle>
            <Trophy className="h-4 w-4 text-chart-1" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{user.points}</div>
            <p className="text-xs text-success flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              Keep earning points!
            </p>
          </CardContent>
        </Card>

        <Card className="transition-all hover:shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Attendance Rate</CardTitle>
            <Target className="h-4 w-4 text-chart-2" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{attendanceRate}%</div>
            <p className="text-xs text-muted-foreground">
              Overall status
            </p>
          </CardContent>
        </Card>

        <Card className="transition-all hover:shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Current Streak</CardTitle>
            <Flame className="h-4 w-4 text-chart-3" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{currentStreak} days</div>
            <p className="text-xs text-muted-foreground">Keep it up!</p>
          </CardContent>
        </Card>

        <Card className="transition-all hover:shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Rank</CardTitle>
            <Trophy className="h-4 w-4 text-chart-5" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">#{studentRank?.rank || "N/A"}</div>
            <p className="text-xs text-muted-foreground">in your class</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-foreground">Today&apos;s Schedule</CardTitle>
            <CardDescription>Your classes for today</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {todaySlots.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">No classes scheduled for today</p>
            ) : (
              todaySlots.map((slot) => {
                const attended = attendance.some((att) => att.slotId === slot.id && att.studentId === user.id)
                return (
                  <div
                    key={slot.id}
                    className="flex items-start justify-between rounded-lg border border-border p-4 transition-all hover:shadow-md"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-foreground">{slot.courseName}</h3>
                        {attended && (
                          <Badge variant="default" className="bg-success text-success-foreground">
                            Present
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{slot.courseCode}</p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {slot.startTime} - {slot.endTime}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {slot.room}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-foreground">Achievements</CardTitle>
            <CardDescription>Your recent accomplishments</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {achievements.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">No achievements yet. Keep attending!</p>
            ) : (
              achievements.map((achievement) => (
                <div
                  key={achievement.id}
                  className="flex items-center gap-3 rounded-lg border border-border p-3 transition-all hover:shadow-md"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-2xl">
                    {achievement.icon}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-foreground">{achievement.name}</h4>
                    <p className="text-sm text-muted-foreground">{achievement.description}</p>
                  </div>
                  <Badge variant="secondary" className="text-foreground">
                    +{achievement.points}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          <LeaderboardContainer
            currentUserId={user.id}
            initialData={leaderboard}
            isCompact={true}
          />
        </div>
      </div>
    </div>
  )
}
