"use client"

import { useState } from "react"
import { Slot } from "@/lib/types"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"

interface AdminTimetableGridProps {
    initialSlots: Slot[]
}

// Generate time slots from 8:00 to 16:00
const TIME_SLOTS = [
    "08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00"
]

export function AdminTimetableGrid({ initialSlots }: AdminTimetableGridProps) {
    const [slots, setSlots] = useState<Slot[]>(initialSlots)

    // Derive unique classes from slots data for Y-Axis
    // Format: "S{semester} {department}"
    const classes = Array.from(new Set(
        slots.map(s => `S${s.semester} ${s.department}`)
    )).sort()

    // Fallback if no slots exist yet, to show an empty grid structure or message
    const displayClasses = classes.length > 0 ? classes : ["No Classes Found"]

    const getSlot = (className: string, time: string) => {
        if (className === "No Classes Found") return undefined

        const [semStr, dept] = className.split(" ")
        const semester = parseInt(semStr.replace("S", ""))

        return slots.find(s =>
            s.semester === semester &&
            s.department === dept &&
            s.startTime === time // Exact match logic
        )
    }

    const getStatusColor = (status: string = "Scheduled") => {
        switch (status) {
            case "Conducted": return "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400"
            case "Late": return "bg-yellow-500/10 border-yellow-500/20 text-yellow-700 dark:text-yellow-400"
            case "Cancelled": return "bg-destructive/10 border-destructive/20 text-destructive"
            default: return "bg-primary/10 border-primary/20 text-primary"
        }
    }

    return (
        <div className="flex flex-col h-full">
            {/* Header Row */}
            <div className="flex border-b bg-card sticky top-0 z-20">
                <div className="w-32 shrink-0 p-4 font-semibold border-r bg-card text-sm text-muted-foreground">
                    Class / Time
                </div>
                <div className="flex-1 overflow-hidden">
                    <div className="flex">
                        {TIME_SLOTS.map((time) => (
                            <div key={time} className="w-40 shrink-0 p-4 text-center text-sm font-medium border-r">
                                {time}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Grid Body */}
            <ScrollArea className="flex-1">
                <div className="min-w-max">
                    {displayClasses.map((cls) => (
                        <div key={cls} className="flex border-b hover:bg-muted/5 transition-colors">
                            {/* Row Label (Sticky Left) */}
                            <div className="w-32 shrink-0 p-4 font-bold border-r bg-background sticky left-0 z-10 flex items-center shadow-sm">
                                {cls}
                            </div>

                            {/* Time Cells */}
                            <div className="flex">
                                {TIME_SLOTS.map((time) => {
                                    const slot = getSlot(cls, time)
                                    const status = slot?.status || "Scheduled"

                                    return (
                                        <div key={`${cls}-${time}`} className="w-40 shrink-0 p-2 border-r h-24 relative group">
                                            {slot ? (
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <div
                                                                className={cn(
                                                                    "w-full h-full rounded-md border p-2 text-xs flex flex-col justify-between cursor-pointer hover:shadow-md transition-all hover:scale-[1.02]",
                                                                    getStatusColor(status)
                                                                )}
                                                            >
                                                                <div className="font-bold truncate" title={slot.courseName}>
                                                                    {slot.courseCode}
                                                                </div>
                                                                <div className="flex items-center justify-between mt-1">
                                                                    <span className="truncate opacity-80">{slot.room}</span>
                                                                    <Badge variant="outline" className="h-4 px-1 text-[10px] bg-background/50 border-current">
                                                                        {status}
                                                                    </Badge>
                                                                </div>
                                                            </div>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p className="font-bold">{slot.courseName}</p>
                                                            <p>Teacher ID: {slot.teacherId}</p>
                                                            <p>Status: {status}</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            ) : (
                                                <div className="w-full h-full rounded-md border border-dashed border-transparent group-hover:border-muted-foreground/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer">
                                                    <span className="text-xs text-muted-foreground font-medium">+ Assign</span>
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    ))}
                </div>
                <ScrollBar orientation="horizontal" />
            </ScrollArea>
        </div>
    )
}
