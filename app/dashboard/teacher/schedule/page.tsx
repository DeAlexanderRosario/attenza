"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, MapPin } from "lucide-react"
import type { Slot } from "@/lib/types"

export default function TeacherSchedulePage() {
    const { user } = useAuth()
    const [slots, setSlots] = useState<Slot[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        if (!user || user.role !== "teacher" || !user.department) return

        const teacher = user;
        async function fetchSlots() {
            try {
                const res = await fetch(`/api/slots?department=${teacher.department}`)
                const data = await res.json()
                const teacherSlots = data.filter((s: Slot) => s.teacherId === teacher.id)
                setSlots(teacherSlots)
            } catch (error) {
                console.error("Error fetching slots:", error)
            } finally {
                setIsLoading(false)
            }
        }

        fetchSlots()
    }, [user])

    if (isLoading) {
        return (
            <div className="flex h-[50vh] items-center justify-center text-muted-foreground">
                <div className="animate-pulse">Loading schedule...</div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-foreground">My Schedule</h1>
                <p className="text-muted-foreground">Your weekly teaching timetable</p>
            </div>

            <div className="grid gap-4">
                {slots.length > 0 ? (
                    slots.map((slot) => (
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
                                            <Clock className="size-4 text-muted-foreground" />
                                            <span>{slot.startTime} - {slot.endTime}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm">
                                            <MapPin className="size-4 text-muted-foreground" />
                                            <span>{slot.room}</span>
                                        </div>
                                    </div>
                                    <div className="space-y-2 text-sm">
                                        <div><span className="text-muted-foreground">Department: </span>{slot.department}</div>
                                        <div><span className="text-muted-foreground">Year/Semester: </span>{slot.year}/{slot.semester}</div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                ) : (
                    <div className="text-center py-10 border rounded-lg bg-muted/20">
                        <p className="text-muted-foreground">No classes scheduled.</p>
                    </div>
                )}
            </div>
        </div>
    )
}
