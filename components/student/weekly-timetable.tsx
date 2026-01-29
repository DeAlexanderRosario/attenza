"use client"

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import type { Slot, ClassSlot } from "@/lib/types"

interface WeeklyTimetableProps {
    slots: Slot[]
    collegeSlots: ClassSlot[]
}

// Sort helper for slots
const sortCollegeSlots = (a: ClassSlot, b: ClassSlot) => {
    return a.startTime.localeCompare(b.startTime)
}

export function WeeklyTimetable({ slots, collegeSlots }: WeeklyTimetableProps) {
    const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
    const sortedCollegeSlots = [...collegeSlots].sort(sortCollegeSlots)

    const getSlot = (day: string, classSlotId: string) => {
        return slots.find(s =>
            s.day.toLowerCase() === day.toLowerCase() &&
            s.classSlotId === classSlotId
        )
    }

    return (
        <Card className="overflow-hidden">
            <CardHeader className="bg-muted/50 pb-4">
                <div className="flex flex-col space-y-1.5">
                    <CardTitle>Regular Class Timetable</CardTitle>
                    <CardDescription>Department: Electronics and Communication Engineering • Semester: S6</CardDescription>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <Table className="border-collapse border-l border-r">
                        <TableHeader>
                            <TableRow className="bg-muted/50 hover:bg-muted/50">
                                <TableHead className="w-[120px] border-r border-b font-bold text-center bg-muted/50">Day/Time</TableHead>
                                {sortedCollegeSlots.map((period) => (
                                    <TableHead
                                        key={period.id}
                                        className={`
                       text-center h-auto py-2 border-r border-b min-w-[120px]
                       ${period.type !== "CLASS" ? "bg-muted/30 w-[80px] min-w-[80px] text-muted-foreground italic font-normal" : "font-bold"}
                     `}
                                    >
                                        <div className="flex flex-col gap-1">
                                            {period.type === "CLASS" && <span className="text-lg">{period.slotNumber}</span>}
                                            {period.type !== "CLASS" && <span className="text-sm">{period.type}</span>}
                                            <span className="text-xs whitespace-nowrap">{period.startTime} - {period.endTime}</span>
                                        </div>
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {DAYS.map((day) => (
                                <TableRow key={day} className="hover:bg-muted/5">
                                    <TableCell className="font-bold border-r border-b bg-muted/20 text-center">{day}</TableCell>
                                    {sortedCollegeSlots.map((period) => {
                                        if (period.type !== "CLASS") {
                                            return (
                                                <TableCell
                                                    key={period.id}
                                                    className="p-0 border-r border-b bg-muted/10"
                                                />
                                            )
                                        }

                                        const slot = getSlot(day, period.id)
                                        return (
                                            <TableCell key={period.id} className="p-2 border-r border-b text-center align-top h-[80px]">
                                                {slot ? (
                                                    <div className="flex flex-col items-center justify-center h-full gap-1">
                                                        <span className="font-bold text-sm leading-tight">{slot.courseCode}</span>
                                                        <span className="text-[9px] text-muted-foreground px-1 py-0.5">
                                                            {slot.courseName}
                                                        </span>
                                                        <span className="text-[10px] text-muted-foreground bg-secondary/50 px-1.5 py-0.5 rounded">
                                                            [{slot.room}]
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <div className="h-full w-full flex items-center justify-center text-muted-foreground/20 text-xs">
                                                        -
                                                    </div>
                                                )}
                                            </TableCell>
                                        )
                                    })}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    )
}
