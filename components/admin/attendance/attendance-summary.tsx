"use client"

import { useState, useEffect } from "react"
import { getDepartmentAttendanceSummary } from "@/app/actions/attendance"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Loader2 } from "lucide-react"

export function AttendanceSummary() {
    const [loading, setLoading] = useState(true)
    const [data, setData] = useState<any[]>([])

    // Filters
    const [department, setDepartment] = useState<string>("all")
    const [year, setYear] = useState<string>("all")

    useEffect(() => {
        fetchData()
    }, [department, year])

    async function fetchData() {
        setLoading(true)
        try {
            const filters: any = {}
            if (department && department !== "all") filters.department = department
            if (year && year !== "all") filters.year = parseInt(year)

            const result = await getDepartmentAttendanceSummary(filters)
            setData(result)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-4">
            {/* Filters */}
            <div className="flex space-x-2">
                <Select value={department} onValueChange={setDepartment}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Department" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Departments</SelectItem>
                        <SelectItem value="CS">Computer Science</SelectItem>
                        <SelectItem value="EE">Electrical Eng.</SelectItem>
                        {/* Dynamic list in real app */}
                    </SelectContent>
                </Select>
                <Select value={year} onValueChange={setYear}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Year" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Years</SelectItem>
                        <SelectItem value="1">1st Year</SelectItem>
                        <SelectItem value="2">2nd Year</SelectItem>
                        <SelectItem value="3">3rd Year</SelectItem>
                        <SelectItem value="4">4th Year</SelectItem>
                    </SelectContent>
                </Select>
                <Button variant="outline" onClick={fetchData}>
                    Refresh
                </Button>
            </div>

            {/* Summary Cards */}
            {loading ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Skeleton className="h-32" /><Skeleton className="h-32" />
                    <Skeleton className="h-32" /><Skeleton className="h-32" />
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-1">
                    {data.length === 0 ? (
                        <div className="p-4 text-center text-muted-foreground border rounded-md">
                            No attendance data found for these filters.
                        </div>
                    ) : (
                        data.map((item) => (
                            <Card key={item.department}>
                                <CardHeader className="pb-2">
                                    <div className="flex justify-between">
                                        <CardTitle>{item.department} Summary</CardTitle>
                                        <span className="text-sm font-bold text-primary">{Math.round(item.attendanceRate)}% Rate</span>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-4 gap-4 text-center">
                                        <div>
                                            <div className="text-2xl font-bold">{item.total}</div>
                                            <div className="text-xs text-muted-foreground">Records</div>
                                        </div>
                                        <div>
                                            <div className="text-2xl font-bold text-green-600">{item.present}</div>
                                            <div className="text-xs text-muted-foreground">Present</div>
                                        </div>
                                        <div>
                                            <div className="text-2xl font-bold text-yellow-600">{item.late}</div>
                                            <div className="text-xs text-muted-foreground">Late</div>
                                        </div>
                                        <div>
                                            <div className="text-2xl font-bold text-red-600">{item.absent}</div>
                                            <div className="text-xs text-muted-foreground">Absent</div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            )}
        </div>
    )
}
