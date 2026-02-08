"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, GraduationCap } from "lucide-react"
import type { User } from "@/lib/types"

export default function TeacherStudentsPage() {
    const { user } = useAuth()
    const [students, setStudents] = useState<User[]>([])
    const [searchQuery, setSearchQuery] = useState("")
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        async function fetchStudents() {
            if (!user) return
            try {
                const params = new URLSearchParams()
                params.append("organizationId", user.organizationId || "org-1")
                params.append("role", "student")

                // If the teacher has specific departments, filter by them
                // For now, using the user's primary departmentId if it exists
                if (user.departmentId) {
                    params.append("departmentId", user.departmentId)
                }

                const res = await fetch(`/api/users?${params.toString()}`)
                const data = await res.json()
                setStudents(data)
            } catch (error) {
                console.error("Error fetching students:", error)
            } finally {
                setIsLoading(false)
            }
        }
        fetchStudents()
    }, [user])

    const filteredStudents = students.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.rfidTag?.toLowerCase().includes(searchQuery.toLowerCase())
    )

    if (isLoading) {
        return (
            <div className="flex h-[50vh] items-center justify-center text-muted-foreground">
                <div className="animate-pulse">Loading students...</div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-foreground">My Students</h1>
                <p className="text-muted-foreground">View and manage students in your departments</p>
            </div>

            <div className="flex items-center gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by name, email, or RFID tag..."
                        className="pl-10"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredStudents.length > 0 ? (
                    filteredStudents.map((student) => (
                        <Card key={student.id} className="hover:border-primary/50 transition-colors">
                            <CardHeader className="flex flex-row items-center gap-4 pb-2">
                                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                    <GraduationCap className="size-6" />
                                </div>
                                <div>
                                    <CardTitle className="text-base">{student.name}</CardTitle>
                                    <CardDescription className="text-xs">{student.email}</CardDescription>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div className="text-muted-foreground">RFID Tag:</div>
                                    <div className="font-mono">{student.rfidTag || "N/A"}</div>
                                    <div className="text-muted-foreground">Year:</div>
                                    <div>{student.year || "N/A"}</div>
                                    <div className="text-muted-foreground">Points:</div>
                                    <div className="text-primary font-bold">{student.points}</div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                ) : (
                    <div className="col-span-full text-center py-10 border rounded-lg bg-muted/20">
                        <p className="text-muted-foreground">No students found matches your search.</p>
                    </div>
                )}
            </div>
        </div>
    )
}
