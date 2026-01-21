import { AttendanceChart } from "@/components/student/attendance-chart"
import { AttendanceTable } from "@/components/student/attendance-table"
import { WeeklyTimetable } from "@/components/student/weekly-timetable"
import { getAttendanceHistory, getDetailedAttendance, getStudentTimetable } from "@/app/actions/student"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default async function AttendancePage({ searchParams }: { searchParams: { view?: string } }) {
    const view = (await searchParams).view || "timetable"

    // Fetch data in parallel
    const [history, detailedAttendance, slots] = await Promise.all([
        getAttendanceHistory(),
        getDetailedAttendance(),
        getStudentTimetable()
    ])

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">Attendance</h1>

            <div className="grid md:grid-cols-3 gap-6">
                <Card className="col-span-2">
                    <CardHeader>
                        <CardTitle>Attendance Trend</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <AttendanceChart data={history} overallPercentage={78} status="Safe" />
                    </CardContent>
                </Card>
                <div className="space-y-6">
                    <Card>
                        <CardHeader><CardTitle>Summary</CardTitle></CardHeader>
                        <CardContent>
                            <div className="text-center">
                                <div className="text-4xl font-bold text-success">78%</div>
                                <div className="text-sm text-muted-foreground">Overall Attendance</div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <Tabs defaultValue={view} className="w-full">
                <TabsList className="mb-4">
                    <TabsTrigger value="timetable">Weekly Timetable</TabsTrigger>
                    <TabsTrigger value="history">Attendance History</TabsTrigger>
                </TabsList>

                <TabsContent value="timetable" className="space-y-4">
                    <WeeklyTimetable slots={slots} />
                </TabsContent>

                <TabsContent value="history">
                    <Card>
                        <CardHeader>
                            <CardTitle>Detailed History</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <AttendanceTable data={detailedAttendance} />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
