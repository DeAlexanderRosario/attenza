"use client"

import * as React from "react"
import { Department, Slot, Class } from "@/lib/types"
import { getDepartmentTimetable } from "@/app/actions/teachers"
import { getClasses } from "@/app/actions/classes"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { DepartmentTimetable } from "./department/department-timetable"
import { Skeleton } from "@/components/ui/skeleton"

interface TimetableClientProps {
    departments: Department[]
}

export function TimetableClient({ departments }: TimetableClientProps) {
    const [selectedDept, setSelectedDept] = React.useState<string>("")
    const [timetable, setTimetable] = React.useState<Slot[]>([])
    const [classes, setClasses] = React.useState<Class[]>([])
    const [loading, setLoading] = React.useState(false)

    React.useEffect(() => {
        if (!selectedDept) {
            setTimetable([])
            setClasses([])
            return
        }

        const fetchData = async () => {
            setLoading(true)
            try {
                const [timetableData, classesData] = await Promise.all([
                    getDepartmentTimetable(selectedDept),
                    getClasses(selectedDept)
                ])
                setTimetable(timetableData)
                setClasses(classesData)
            } catch (error) {
                console.error("Failed to fetch data:", error)
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [selectedDept])

    return (
        <div className="space-y-6">
            {/* Department Selector */}
            <Card>
                <CardHeader>
                    <CardTitle>Select Department</CardTitle>
                </CardHeader>
                <CardContent>
                    <Select value={selectedDept} onValueChange={setSelectedDept}>
                        <SelectTrigger className="w-full md:w-[300px]">
                            <SelectValue placeholder="Choose a department..." />
                        </SelectTrigger>
                        <SelectContent>
                            {departments.map(dept => (
                                <SelectItem key={dept.code} value={dept.code}>
                                    {dept.name} ({dept.code})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </CardContent>
            </Card>

            {/* Timetable Display */}
            {loading ? (
                <div className="space-y-4">
                    <Skeleton className="h-[200px] w-full" />
                    <Skeleton className="h-[200px] w-full" />
                </div>
            ) : selectedDept ? (
                <DepartmentTimetable
                    slots={timetable}
                    departmentCode={selectedDept}
                    classes={classes}
                />
            ) : (
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-center py-12 text-muted-foreground">
                            Please select a department to view the timetable
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
