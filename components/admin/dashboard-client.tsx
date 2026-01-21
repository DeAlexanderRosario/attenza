"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, BookOpen, Activity, ShieldCheck, Calendar, Zap } from "lucide-react"
import { OverviewChart } from "@/components/admin/overview-chart"
import { RecentActivity } from "@/components/admin/recent-activity"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { io } from "socket.io-client"
import { useToast } from "@/components/ui/use-toast"

interface DashboardData {
    counts: {
        students: number
        teachers: number
        slots: number
    }
    chartData: { name: string, total: number }[]
    activities: any[]
}

export function DashboardClient({ initialData }: { initialData: DashboardData }) {
    const [data, setData] = useState(initialData)
    const [isConnected, setIsConnected] = useState(false)
    const { toast } = useToast()

    useEffect(() => {
        // Connect to Socket Server
        // Assuming socket server runs on port 3001 or proxied via /api/socket (if configured)
        // For this setup, we'll try the direct port or relative path if proxied.
        // Since package.json has "socket.io", we use it.

        const socket = io("http://localhost:3001") // Direct connection to custom server

        socket.on("connect", () => {
            console.log("Connected to Real-time Server")
            setIsConnected(true)
        })

        socket.on("disconnect", () => {
            console.log("Disconnected from Real-time Server")
            setIsConnected(false)
        })

        // Listen for new activity (Check-ins)
        socket.on("new_activity", (activity: any) => {
            setData(prev => {
                const newActivities = [activity, ...prev.activities].slice(0, 10)

                // Update chart if it's a today's attendance
                const todayName = new Date().toLocaleDateString('en-US', { weekday: 'short' })
                const newChart = prev.chartData.map(day => {
                    if (day.name === todayName) {
                        return { ...day, total: day.total + 1 }
                    }
                    return day
                })

                return {
                    ...prev,
                    activities: newActivities,
                    chartData: newChart
                }
            })

            toast({
                title: "New Check-in",
                description: `${activity.user} just checked in.`,
                duration: 3000
            })
        })

        return () => {
            socket.disconnect()
        }
    }, [])

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* Header Section */}
            <div className="flex items-center justify-between space-y-2">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                        Dashboard
                    </h2>
                    <div className="flex items-center gap-2">
                        <p className="text-muted-foreground">
                            Overview of your institute's performance today.
                        </p>
                        {isConnected ? (
                            <span className="flex items-center text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                                <Zap className="w-3 h-3 mr-1 fill-green-600" />
                                Live
                            </span>
                        ) : (
                            <span className="flex items-center text-xs text-muted-foreground bg-gray-50 px-2 py-0.5 rounded-full border">
                                Offline
                            </span>
                        )}
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    <Button asChild variant="outline">
                        <Link href="/dashboard/admin/timetable">
                            <Calendar className="mr-2 h-4 w-4" />
                            Timetable
                        </Link>
                    </Button>
                    <Button>
                        Download Report
                    </Button>
                </div>
            </div>

            {/* Metrics Row */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="hover:bg-muted/50 transition-colors shadow-sm dark:bg-card/20">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                        <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                            <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.counts.students}</div>
                        <p className="text-xs text-muted-foreground">+12% from last month</p>
                    </CardContent>
                </Card>

                <Card className="hover:bg-muted/50 transition-colors shadow-sm dark:bg-card/20">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Teachers</CardTitle>
                        <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                            <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.counts.teachers}</div>
                        <p className="text-xs text-muted-foreground">100% attendance today</p>
                    </CardContent>
                </Card>

                <Card className="hover:bg-muted/50 transition-colors shadow-sm dark:bg-card/20">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Classes Scheduled</CardTitle>
                        <div className="h-8 w-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                            <BookOpen className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.counts.slots}</div>
                        <p className="text-xs text-muted-foreground">Across various batches</p>
                    </CardContent>
                </Card>

                <Card className="hover:bg-muted/50 transition-colors shadow-sm dark:bg-card/20">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">System Health</CardTitle>
                        <div className="h-8 w-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                            <Activity className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-500">98.9%</div>
                        <p className="text-xs text-muted-foreground">All systems operational</p>
                    </CardContent>
                </Card>
            </div>

            {/* Charts & Activity */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <div className="col-span-4">
                    <OverviewChart data={data.chartData} />
                </div>
                <div className="col-span-3">
                    <RecentActivity activities={data.activities} />
                </div>
            </div>
        </div>
    )
}
