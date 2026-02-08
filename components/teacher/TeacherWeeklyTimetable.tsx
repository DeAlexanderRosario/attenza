"use client"

import { useState, useEffect } from "react"
import { ClassSlot, ClassTimetableEntry, Class } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Coffee, Calendar, Utensils, Clock, MapPin } from "lucide-react"
import { getCollegeSlots } from "@/app/actions/class-slots"
import { getClasses } from "@/app/actions/classes"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

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
        const slots = await getCollegeSlots()
        setCollegeSlots(slots.filter(s => s.isActive))

        // Get all classes to extract their timetables
        const classes = await getClasses()
        const teacherEntries: (ClassTimetableEntry & { classId: string, className: string })[] = []

        classes.forEach(cls => {
          if (cls.timetable) {
            cls.timetable.forEach(entry => {
              if (entry.teacherId === teacherId) {
                teacherEntries.push({
                  ...entry,
                  classId: cls.id,
                  className: cls.name
                })
              }
            })
          }
        })

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

  const gridTemplateColumns = `100px ${collegeSlots.map(s => 
    s.type === "CLASS" ? "minmax(150px, 1fr)" : "50px"
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

      <div className="rounded-xl border border-border/60 bg-card shadow-sm w-full overflow-x-auto overflow-y-hidden">
        {/* Header */}
        <div className="grid divide-x divide-border/60 border-b border-border/60 bg-muted/30 sticky top-0 z-10" 
             style={{ gridTemplateColumns }}>
          <div className="p-3 font-bold text-xs text-center flex items-center justify-center">
            Day
          </div>
          {collegeSlots.map((slot) => (
            <div key={slot.id} className={cn(
              "py-3 px-2 text-center flex flex-col justify-center items-center h-16",
              getSlotColor(slot.type)
            )}>
              {slot.type === "CLASS" ? (
                <>
                  <span className="font-semibold text-xs">Slot {slot.slotNumber}</span>
                  <span className="text-[10px] text-muted-foreground font-mono mt-1">
                    {slot.startTime} - {slot.endTime}
                  </span>
                </>
              ) : (
                <div className="flex flex-col items-center gap-1">
                  {getSlotIcon(slot.type)}
                  <span className="text-[9px] font-bold text-orange-500 uppercase">
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
            
            <div className="p-3 font-semibold text-sm flex items-center justify-center bg-muted/10">
              {day}
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
                <div key={slot.id} className="p-2 h-32 relative group">
                  {entry ? (
                    <div className="h-full w-full rounded-lg p-3 flex flex-col justify-between shadow-sm border-l-4 border-l-primary bg-card border border-border/60 transition-all hover:shadow-md hover:scale-[1.02]">
                      <div className="space-y-1">
                        <div className="font-bold text-xs leading-tight line-clamp-2">
                          {entry.subjectName}
                        </div>
                        <div className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {entry.subjectCode}
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5">
                           <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 font-bold uppercase tracking-wider">
                            {entry.className}
                          </Badge>
                        </div>
                        {entry.room && (
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <MapPin className="h-2.5 w-2.5" />
                            {entry.room}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="h-full w-full rounded-lg border-2 border-dashed border-border/20 flex items-center justify-center">
                      <span className="text-[10px] text-muted-foreground/30">Free Slot</span>
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
