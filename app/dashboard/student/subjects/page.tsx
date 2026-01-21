"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { User } from "lucide-react"

// Mock Data
const subjects = [
    { code: "CS301", name: "Data Structures", faculty: "Dr. Sharma", attendance: 82, status: "Safe" },
    { code: "CS302", name: "Database Systems", faculty: "Prof. Gupta", attendance: 60, status: "At Risk" },
    { code: "CS303", name: "Operating Systems", faculty: "Dr. Alicia", attendance: 76, status: "Safe" },
    { code: "CS304", name: "Software Engineering", faculty: "Prof. Raj", attendance: 90, status: "Safe" },
]

export default function SubjectsPage() {
    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">Academic Subjects</h1>

            <div className="grid gap-6 md:grid-cols-2">
                {subjects.map((subject) => (
                    <Card key={subject.code} className="transition-all hover:shadow-md">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <div>
                                <CardTitle className="text-xl">{subject.name}</CardTitle>
                                <CardDescription>{subject.code}</CardDescription>
                            </div>
                            <Badge variant={subject.status === "Safe" ? "default" : "destructive"}>
                                {subject.status}
                            </Badge>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <User className="w-4 h-4" />
                                {subject.faculty}
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span>Attendance</span>
                                    <span className="font-bold">{subject.attendance}%</span>
                                </div>
                                <Progress value={subject.attendance} className={
                                    subject.attendance < 75 ? "bg-destructive/20 [&>*]:bg-destructive" : ""
                                } />
                                {subject.attendance < 75 && (
                                    <p className="text-xs text-destructive font-medium mt-1">
                                        Needs attention! Attend next {Math.ceil((75 - subject.attendance) / 5)} classes.
                                    </p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}
