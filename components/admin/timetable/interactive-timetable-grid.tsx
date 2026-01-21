"use client"

import { useState, useEffect } from "react"
import { ClassSlot, ClassTimetableEntry, Class, Department } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Coffee, Calendar, Utensils } from "lucide-react"
import { getCollegeSlots } from "@/app/actions/class-slots"
import { getClassTimetable, createTimetableEntry, updateTimetableEntry, deleteTimetableEntry } from "@/app/actions/timetable"
import { getClasses } from "@/app/actions/classes"
import { getTeachers } from "@/app/actions/admin"
import { getSubjects } from "@/app/actions/subjects"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

interface InteractiveTimetableGridProps {
    departments: Department[]
}

export function InteractiveTimetableGrid({ departments }: InteractiveTimetableGridProps) {
    const [selectedDeptId, setSelectedDeptId] = useState<string>(departments[0]?.id || "")
    const [selectedClassId, setSelectedClassId] = useState<string>("")

    const [classes, setClasses] = useState<Class[]>([])
    const [collegeSlots, setCollegeSlots] = useState<ClassSlot[]>([])
    const [timetableEntries, setTimetableEntries] = useState<ClassTimetableEntry[]>([])
    const [teachers, setTeachers] = useState<any[]>([])
    const [subjects, setSubjects] = useState<any[]>([])
    const [loading, setLoading] = useState(false)

    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingEntry, setEditingEntry] = useState<{
        day: string
        slotId: string
        entry?: ClassTimetableEntry
    } | null>(null)
    const [formData, setFormData] = useState({
        subjectName: "",
        subjectCode: "",
        teacherId: "",
        room: ""
    })

    const { toast } = useToast()

    // Load organization slots and teachers/subjects on mount
    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const [slots, teachersList, subjectsList] = await Promise.all([
                    getCollegeSlots(),
                    getTeachers(),
                    getSubjects()
                ])
                setCollegeSlots(slots.filter(s => s.isActive))
                setTeachers(teachersList)
                setSubjects(subjectsList)
            } catch (error) {
                console.error("Failed to load initial data:", error)
            }
        }
        loadInitialData()
    }, [])

    // Load classes when department changes
    useEffect(() => {
        if (!selectedDeptId) return
        const loadClasses = async () => {
            setLoading(true)
            try {
                const cls = await getClasses(selectedDeptId)
                setClasses(cls)
                if (cls.length > 0) setSelectedClassId(cls[0].id)
                else setSelectedClassId("")
            } catch (error) {
                console.error(error)
                toast({ title: "Error", description: "Failed to load classes", variant: "destructive" })
            } finally {
                setLoading(false)
            }
        }
        loadClasses()
    }, [selectedDeptId, toast])

    // Load timetable when class changes
    useEffect(() => {
        if (!selectedClassId) return
        const loadTimetable = async () => {
            setLoading(true)
            try {
                const entries = await getClassTimetable(selectedClassId)
                setTimetableEntries(entries)
            } catch (error) {
                console.error(error)
            } finally {
                setLoading(false)
            }
        }
        loadTimetable()
    }, [selectedClassId])

    const handleCellClick = (day: string, slot: ClassSlot) => {
        if (!selectedClassId) {
            toast({ title: "Select a Class", description: "Please select a class first", variant: "destructive" })
            return
        }

        const existing = timetableEntries.find(e => e.dayOfWeek === day && e.classSlotId === slot.id)

        setEditingEntry({ day, slotId: slot.id, entry: existing })
        setFormData({
            subjectName: existing?.subjectName || "",
            subjectCode: existing?.subjectCode || "",
            teacherId: existing?.teacherId || "",
            room: existing?.room || ""
        })
        setIsDialogOpen(true)
    }

    const handleSave = async () => {
        if (!editingEntry || !selectedClassId) return

        try {
            if (editingEntry.entry) {
                // Update existing
                await updateTimetableEntry(
                    selectedClassId,
                    editingEntry.entry.id,
                    formData
                )
            } else {
                // Create new
                await createTimetableEntry({
                    classId: selectedClassId,
                    classSlotId: editingEntry.slotId,
                    dayOfWeek: editingEntry.day,
                    ...formData
                })
            }

            // Reload timetable
            const entries = await getClassTimetable(selectedClassId)
            setTimetableEntries(entries)
            toast({ title: "Success", description: "Timetable updated successfully" })
            setIsDialogOpen(false)
        } catch (error) {
            console.error(error)
            toast({ title: "Error", description: "Failed to save entry", variant: "destructive" })
        }
    }

    const handleDelete = async () => {
        if (!editingEntry?.entry || !selectedClassId) return

        try {
            await deleteTimetableEntry(selectedClassId, editingEntry.entry.id)
            const entries = await getClassTimetable(selectedClassId)
            setTimetableEntries(entries)
            toast({ title: "Success", description: "Entry deleted successfully" })
            setIsDialogOpen(false)
        } catch (error) {
            console.error(error)
            toast({ title: "Error", description: "Failed to delete entry", variant: "destructive" })
        }
    }

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

    // Calculate grid columns
    const gridTemplateColumns = `100px ${collegeSlots.map(s =>
        s.type === "CLASS" ? "1fr" : "48px"
    ).join(" ")}`

    return (
        <div className="space-y-6 p-1">
            {/* Controls */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg font-medium flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-primary" />
                        Timetable Configuration
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col md:flex-row gap-6 items-end">
                        <div className="space-y-2 flex-1 w-full">
                            <Label>Department</Label>
                            <Select value={selectedDeptId} onValueChange={setSelectedDeptId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Department" />
                                </SelectTrigger>
                                <SelectContent>
                                    {departments.map(d => (
                                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2 flex-1 w-full">
                            <Label>Class / Batch</Label>
                            <Select value={selectedClassId} onValueChange={setSelectedClassId} disabled={!selectedDeptId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Class" />
                                </SelectTrigger>
                                <SelectContent>
                                    {classes.map(c => (
                                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Timetable Grid */}
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
                {loading ? (
                    <div className="h-96 flex items-center justify-center">
                        <div className="h-8 w-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                    </div>
                ) : (
                    DAYS.map((day, rowIndex) => (
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

                                const entry = timetableEntries.find(e =>
                                    e.dayOfWeek === day && e.classSlotId === slot.id
                                )

                                return (
                                    <div
                                        key={slot.id}
                                        className="p-1 h-28 relative group cursor-pointer hover:bg-muted/50"
                                        onClick={() => handleCellClick(day, slot)}
                                    >
                                        {entry ? (
                                            <div className="h-full w-full rounded-md p-2 flex flex-col justify-between shadow-sm border-l-[3px] border-l-indigo-500 bg-card border border-border/60 hover:shadow-md">
                                                <div className="space-y-0.5">
                                                    <div className="font-bold text-[11px] leading-tight line-clamp-2">
                                                        {entry.subjectName}
                                                    </div>
                                                    <div className="text-[10px] text-muted-foreground font-mono">
                                                        {entry.subjectCode}
                                                    </div>
                                                </div>
                                                {entry.room && (
                                                    <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 w-fit">
                                                        {entry.room}
                                                    </Badge>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="h-full w-full rounded-md border-2 border-dashed border-border/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <span className="text-[10px] text-muted-foreground">Click to add</span>
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    ))
                )}
            </div>

            {/* Edit Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {editingEntry?.entry ? "Edit" : "Add"} Timetable Entry
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Subject</Label>
                            <Select value={formData.subjectName} onValueChange={(val) => {
                                const subject = subjects.find(s => s.name === val)
                                setFormData({
                                    ...formData,
                                    subjectName: val,
                                    subjectCode: subject?.code || ""
                                })
                            }}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Subject" />
                                </SelectTrigger>
                                <SelectContent>
                                    {subjects.map(s => (
                                        <SelectItem key={s.id} value={s.name}>{s.name} ({s.code})</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Teacher</Label>
                            <Select value={formData.teacherId} onValueChange={(val) => setFormData({ ...formData, teacherId: val })}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Teacher" />
                                </SelectTrigger>
                                <SelectContent>
                                    {teachers.map(t => (
                                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Room</Label>
                            <Input
                                value={formData.room}
                                onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                                placeholder="e.g., Room 101"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        {editingEntry?.entry && (
                            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
                        )}
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSave}>Save</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}