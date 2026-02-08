"use client"

import { useState, useEffect } from "react"
import { ClassSlot, ClassTimetableEntry } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Coffee, Calendar, Utensils, Clock, MapPin } from "lucide-react"
import { getCollegeSlots } from "@/app/actions/class-slots"
import { getTeacherTimetable } from "@/app/actions/timetable"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

interface TeacherWeeklyTimetableProps {
  teacherId: string
}

export function TeacherWeeklyTimetable({ teacherId }: TeacherWeeklyTimetableProps) {
  const [collegeSlots, setCollegeSlots] = useState<ClassSlot[]>([])
  const [allTimetableEntries, setAllTimetableEntries] = useState<(ClassTimetableEntry & { classId: string, className: string })[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        const [slots, teacherEntries] = await Promise.all([
          getCollegeSlots(),
          getTeacherTimetable(teacherId)
        ])
        setCollegeSlots(slots.filter(s => s.isActive))
        setAllTimetableEntries(teacherEntries)
      } catch (error) {
        console.error("Failed to load timetable data:", error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [teacherId])

  const getSlotIcon = (type: string) => {
    switch (type) {
      case "BREAK": return <Coffee className="h-3 w-3" />
      case "LUNCH": return <Utensils className="h-3 w-3" />
      default: return null
    }
  }

  const getSlotColor = (type: string) => {
    switch (type) {
      case "BREAK": return "bg-orange-50/30 dark:bg-orange-950/20"
      case "LUNCH": return "bg-amber-50/30 dark:bg-amber-950/20"
      default: return ""
    }
  }

  // Align grid columns with admin implementation
  const gridTemplateColumns = `100px ${collegeSlots.map(s =>
    s.type === "CLASS" ? "1fr" : "48px"
  ).join(" ")}`

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="h-64 flex items-center justify-center">
          <div className="h-8 w-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          Weekly Timetable
        </h2>
      </div>

      <div className="rounded-xl border border-border/60 bg-card shadow-sm w-full overflow-x-auto">
        {/* Header */}
        <div className="grid divide-x divide-border/60 border-b border-border/60 bg-muted/30 sticky top-0 z-10"
          style={{ gridTemplateColumns }}>
          <div className="p-2 font-bold text-xs text-center flex items-center justify-center">
            Day
          </div>
          {collegeSlots.map((slot) => (
            <div key={slot.id} className={cn(
              "py-3 px-1 text-center flex flex-col justify-center items-center",
              getSlotColor(slot.type)
            )}>
              {slot.type === "CLASS" ? (
                <>
                  <span className="font-semibold text-xs">Slot {slot.slotNumber}</span>
                  <span className="text-[10px] text-muted-foreground font-mono mt-0.5">
                    {slot.startTime}
                  </span>
                </>
              ) : (
                <div className="flex flex-col items-center gap-1">
                  {getSlotIcon(slot.type)}
                  <span className="text-[10px] font-bold text-orange-500 writing-mode-vertical">
                    {slot.type}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Body */}
        {DAYS.map((day, rowIndex) => (
          <div key={day}
            className={cn(
              "grid divide-x divide-border/60 border-b last:border-0",
              rowIndex % 2 === 0 ? "bg-background" : "bg-muted/5"
            )}
            style={{ gridTemplateColumns }}>

            <div className="p-2 font-semibold text-xs flex items-center justify-center bg-muted/10">
              {day.substring(0, 3).toUpperCase()}
            </div>

            {collegeSlots.map((slot) => {
              if (slot.type !== "CLASS") {
                return (
                  <div key={slot.id} className={cn("flex items-center justify-center", getSlotColor(slot.type))}>
                    {getSlotIcon(slot.type)}
                  </div>
                )
              }

              const entry = allTimetableEntries.find(e =>
                e.dayOfWeek === day && e.classSlotId === slot.id
              )

              return (
                <div key={slot.id} className="p-1 h-28 relative group">
                  {entry ? (
                    <div className="h-full w-full rounded-md p-2 flex flex-col justify-between shadow-sm border-l-[3px] border-l-primary bg-card border border-border/60 transition-all hover:shadow-md hover:scale-[1.02]">
                      <div className="space-y-0.5">
                        <div className="font-bold text-[11px] leading-tight line-clamp-2">
                          {entry.subjectName}
                        </div>
                        <div className="text-[10px] text-muted-foreground font-mono flex items-center gap-1">
                          {entry.subjectCode}
                        </div>
                      </div>
                      <div className="space-y-1.5 mt-auto">
                        <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4 font-bold uppercase tracking-wider">
                          {entry.className}
                        </Badge>
                        {entry.room && (
                          <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
                            <MapPin className="h-2.5 w-2.5" />
                            {entry.room}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="h-full w-full rounded-md border-2 border-dashed border-border/20 flex items-center justify-center group-hover:bg-muted/30 transition-colors">
                      <span className="text-[9px] text-muted-foreground/30 font-medium">Free</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
