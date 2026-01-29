import { AttendanceChart } from "@/components/student/attendance-chart"
import { AttendanceTable } from "@/components/student/attendance-table"
import { SubjectAttendanceTable } from "@/components/student/subject-attendance-table"
import { WeeklyTimetable } from "@/components/student/weekly-timetable"
import { getAttendanceHistory, getDetailedAttendance, getStudentTimetable, getStudentDashboardData, getSubjectWiseAttendance } from "@/app/actions/student"
import { getCollegeSlots } from "@/app/actions/class-slots"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default async function AttendancePage({ searchParams }: { searchParams: { view?: string } }) {
    const view = (await searchParams).view || "subjects"

    // Fetch data in parallel
    const [history, dashboardData] = await Promise.all([
        getAttendanceHistory(),
        getStudentDashboardData(),
    ])

    const stats = dashboardData.stats
    const slots = dashboardData.todaySlots // Or get all slots if needed for weekly view

    // We need all slots for the WeeklyTimetable, getStudentDashboardData only returns today's
    const allSlots = await getStudentTimetable()
    const collegeSlots = await getCollegeSlots()
    const detailedData = await getDetailedAttendance()
    const subjectWiseData = await getSubjectWiseAttendance()

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">Attendance</h1>

            <div className="grid md:grid-cols-3 gap-6">
                <Card className="col-span-2">
                    <CardHeader>
                        <CardTitle>Attendance Trend</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <AttendanceChart data={history} overallPercentage={stats.overall} status={stats.status as any} />
                    </CardContent>
                </Card>
                <div className="space-y-6">
                    <Card>
                        <CardHeader><CardTitle>Summary</CardTitle></CardHeader>
                        <CardContent>
                            <div className="text-center">
                                <div className={`text-4xl font-bold ${stats.overall >= 75 ? 'text-success' : 'text-destructive'}`}>
                                    {stats.overall}%
                                </div>
                                <div className="text-sm text-muted-foreground">Overall Attendance</div>
                                <div className="mt-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                    {stats.attended} / {stats.total} Sessions Held
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <Tabs defaultValue={view} className="w-full">
                <TabsList className="mb-4">
                    <TabsTrigger value="subjects">Subject-wise</TabsTrigger>
                    <TabsTrigger value="timetable">Weekly Timetable</TabsTrigger>
                    <TabsTrigger value="history">Attendance History</TabsTrigger>
                </TabsList>

                <TabsContent value="subjects" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Subject-wise Attendance</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <SubjectAttendanceTable data={subjectWiseData as any} />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="timetable" className="space-y-4">
                    <WeeklyTimetable slots={allSlots} collegeSlots={collegeSlots} />
                </TabsContent>

                <TabsContent value="history">
                    <Card>
                        <CardHeader>
                            <CardTitle>Detailed History</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <AttendanceTable data={detailedData as any} />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
