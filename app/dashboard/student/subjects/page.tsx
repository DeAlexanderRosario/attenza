import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { User } from "lucide-react"
import { getStudentAttendanceDetails } from "@/app/actions/attendance"
import { getSessionUser } from "@/lib/session"

export default async function SubjectsPage() {
    const sessionUser = await getSessionUser()
    if (!sessionUser) return null

    const details = await getStudentAttendanceDetails(sessionUser.id)
    if (!details) return <div>Failed to load subject data</div>

    const subjects = details.subjects
    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">Academic Subjects</h1>

            <div className="grid gap-6 md:grid-cols-2">
                {subjects.map((subject) => (
                    <Card key={subject.subjectCode} className="transition-all hover:shadow-md">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <div>
                                <CardTitle className="text-xl">{subject.subjectName}</CardTitle>
                                <CardDescription>{subject.subjectCode}</CardDescription>
                            </div>
                            <Badge variant={subject.percentage >= 75 ? "default" : "destructive"}>
                                {subject.percentage >= 75 ? "Safe" : "At Risk"}
                            </Badge>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <User className="w-4 h-4" />
                                Faculty: Not Assigned
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span>Attendance</span>
                                    <span className="font-bold">{subject.percentage}%</span>
                                </div>
                                <Progress value={subject.percentage} className={
                                    subject.percentage < 75 ? "bg-destructive/20 [&>*]:bg-destructive" : ""
                                } />
                                {subject.percentage < 75 && (
                                    <p className="text-xs text-destructive font-medium mt-1">
                                        Needs attention! {subject.attended} / {subject.total} classes attended.
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
