"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Plus, UserCheck } from "lucide-react"

// Mock Batches (In real app, fetch from DB)
const BATCHES = [
    { id: "b1", department: "CSE", year: 4, semester: 7, classTeacher: "Dr. Smith" },
    { id: "b2", department: "CSE", year: 3, semester: 5, classTeacher: "Prof. Jane" },
    { id: "b3", department: "ECE", year: 2, semester: 3, classTeacher: "Unassigned" },
]

export default function ClassesPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Classes & Batches</h1>
                    <p className="text-muted-foreground">Manage academic batches and assign Class Teachers (Form Tutors).</p>
                </div>
                <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Batch
                </Button>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {BATCHES.map((batch) => (
                    <Card key={batch.id} className="relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <UserCheck className="w-24 h-24" />
                        </div>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                {batch.department} <Badge variant="outline">S{batch.semester}</Badge>
                            </CardTitle>
                            <CardDescription>Year {batch.year} • Batch 2024-28</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                                    <span className="text-sm font-medium">Class Teacher</span>
                                    {batch.classTeacher !== "Unassigned" ? (
                                        <div className="flex items-center gap-2">
                                            <Avatar className="w-6 h-6">
                                                <AvatarFallback>{batch.classTeacher.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <span className="text-sm">{batch.classTeacher}</span>
                                        </div>
                                    ) : (
                                        <Badge variant="secondary">Unassigned</Badge>
                                    )}
                                </div>
                                <Button variant="outline" className="w-full">
                                    {batch.classTeacher === "Unassigned" ? "Assign Teacher" : "Change Teacher"}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}
