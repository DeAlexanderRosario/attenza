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
import { Badge } from "@/components/ui/badge"
import type { Slot } from "@/lib/types"

interface WeeklyTimetableProps {
    slots: Slot[]
}

const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"]

const PERIODS = [
    { id: 1, label: "1", time: "8.00 - 8.45" },
    { id: "break-1", label: "Break", time: "8.45 - 9.10", isBreak: true },
    { id: 2, label: "2", time: "9.10 - 9.55" },
    { id: 3, label: "3", time: "10.00 - 10.45" },
    { id: 4, label: "4", time: "10.50 - 11.35" },
    { id: "break-2", label: "Break", time: "11.35 - 11.55", isBreak: true },
    { id: 5, label: "5", time: "11.55 - 12.40" },
    { id: 6, label: "6", time: "12.45 - 1.30" },
]

export function WeeklyTimetable({ slots }: WeeklyTimetableProps) {
    const getSlot = (day: string, periodTime: string) => {
        // In a real app, logic would match time ranges. 
        // For this mock/demo, we'll try to match exact start time or period ID if we had it.
        // Simplifying mapping for now:
        const startTimeMap: Record<string, string> = {
            "8.00": "08:00", "9.10": "09:10", "10.00": "10:00",
            "10.50": "10:50", "11.55": "11:55", "12.45": "12:45"
        }

        // Extract start time from the period label "8.00 - 8.45" -> "8.00"
        const periodStart = periodTime.split(" - ")[0]

        return slots.find(s =>
            s.day.toUpperCase() === day &&
            (s.startTime === periodStart || s.startTime === startTimeMap[periodStart])
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
                                {PERIODS.map((period) => (
                                    <TableHead
                                        key={period.id}
                                        className={`
                      text-center h-auto py-2 border-r border-b min-w-[100px]
                      ${period.isBreak ? "bg-muted/30 w-[60px] min-w-[60px] text-muted-foreground italic font-normal" : "font-bold"}
                    `}
                                    >
                                        <div className="flex flex-col gap-1">
                                            {!period.isBreak && <span className="text-lg">{period.label}</span>}
                                            <span className="text-xs whitespace-nowrap">{period.time}</span>
                                        </div>
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {DAYS.map((day) => (
                                <TableRow key={day} className="hover:bg-muted/5">
                                    <TableCell className="font-bold border-r border-b bg-muted/20 text-center">{day}</TableCell>
                                    {PERIODS.map((period) => {
                                        if (period.isBreak) {
                                            return (
                                                <TableCell
                                                    key={period.id}
                                                    className="p-0 border-r border-b bg-muted/10"
                                                />
                                            )
                                        }

                                        const slot = getSlot(day, period.time)
                                        return (
                                            <TableCell key={period.id} className="p-2 border-r border-b text-center align-top h-[80px]">
                                                {slot ? (
                                                    <div className="flex flex-col items-center justify-center h-full gap-1">
                                                        <span className="font-bold text-sm">{slot.courseCode}</span>
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
