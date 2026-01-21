"use client"

import { useState, useMemo } from "react"
import { Slot, User } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Plus, Trash2, Coffee } from "lucide-react"
import { upsertSlot, deleteSlot, TimeSlotConfig } from "@/app/actions/admin"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { HolidayManager } from "./holiday-manager"
import { TimeSlotEditor } from "./time-slot-editor"

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface TimetableManagerProps {
    initialSlots: Slot[]
    teachers: User[]
    holidays: any[]
    timeSlots: TimeSlotConfig[]
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

export function TimetableManager({ initialSlots, teachers, holidays, timeSlots }: TimetableManagerProps) {
    const [selectedDept, setSelectedDept] = useState("Computer Science")
    const [selectedYear, setSelectedYear] = useState(1)
    const [isSlotDialogOpen, setIsSlotDialogOpen] = useState(false)
    const [editingSlot, setEditingSlot] = useState<Partial<Slot> | null>(null)

    const { toast } = useToast()
    const router = useRouter()

    const currentSlots = useMemo(() => {
        return initialSlots.filter(s =>
            (s.department === selectedDept || !s.department) &&
            (s.year === selectedYear || !s.year)
        )
    }, [initialSlots, selectedDept, selectedYear])

    const handleCellClick = (day: string, periodStart: string, periodEnd: string) => {
        // Find slot matching logic. Using Start Time as key is common.
        const existing = currentSlots.find(s => s.day === day && s.startTime === periodStart)
        setEditingSlot(existing || {
            day,
            startTime: periodStart,
            endTime: periodEnd,
            department: selectedDept,
            year: selectedYear,
            semester: 1
        })
        setIsSlotDialogOpen(true)
    }

    const handleSaveSlot = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const formData = new FormData(e.currentTarget)

        try {
            const teacherId = formData.get("teacherId") as string

            await upsertSlot({
                ...editingSlot,
                courseName: formData.get("courseName") as string,
                courseCode: formData.get("courseCode") as string,
                room: formData.get("room") as string,
                teacherId: teacherId,
            })
            toast({ title: "Saved", description: "Timetable updated." })
            router.refresh()
            setIsSlotDialogOpen(false)
        } catch (e) {
            toast({ title: "Error", description: "Failed to save slot." })
        }
    }

    const handleDeleteSlot = async () => {
        if (!editingSlot?.id) return
        await deleteSlot(editingSlot.id)
        router.refresh()
        setIsSlotDialogOpen(false)
    }

    const gridTemplateCols = useMemo(() => {
        const cols = timeSlots.map(slot => slot.type === 'break' ? '80px' : 'minmax(160px, 1fr)').join(' ')
        return `100px ${cols}`
    }, [timeSlots])

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-muted/30 p-4 rounded-lg border">
                <div className="flex gap-4">
                    <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Department</Label>
                        <Select value={selectedDept} onValueChange={setSelectedDept}>
                            <SelectTrigger className="w-[180px] bg-background">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Computer Science">Computer Science</SelectItem>
                                <SelectItem value="Electronics">Electronics</SelectItem>
                                <SelectItem value="Mechanical">Mechanical</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Year</Label>
                        <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
                            <SelectTrigger className="w-[100px] bg-background">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="1">Year 1</SelectItem>
                                <SelectItem value="2">Year 2</SelectItem>
                                <SelectItem value="3">Year 3</SelectItem>
                                <SelectItem value="4">Year 4</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <TimeSlotEditor initialSlots={timeSlots} />
                    <HolidayManager />
                </div>
            </div>

            {/* Timetable Grid */}
            <div className="rounded-xl border border-white/10 glass-card overflow-x-auto pb-2">
                <div className="min-w-max">
                    <div className="grid divide-x border-b border-white/5 bg-primary/5" style={{ gridTemplateColumns: gridTemplateCols }}>
                        <div className="p-3 font-semibold text-sm text-center self-center text-muted-foreground">Day / Time</div>
                        {timeSlots.map((period, i) => (
                            <div key={i} className={cn(
                                "p-2 text-center flex flex-col justify-center",
                                period.type === "break" && "bg-amber-500/10 dark:bg-amber-500/20 text-white border-x border-amber-500/20 shadow-[inset_0_0_15px_rgba(245,158,11,0.1)] dark:shadow-[inset_0_0_25px_rgba(245,158,11,0.2)]"
                            )}>
                                <div className={cn("font-bold text-sm truncate", period.type === "break" && "drop-shadow-[0_0_10px_rgba(245,158,11,0.8)] dark:drop-shadow-[0_0_15px_rgba(245,158,11,1)] text-white")} title={period.label}>{period.label}</div>
                                <div className="text-[10px] text-white/70 dark:text-white/90 uppercase tracking-widest">{period.startTime} - {period.endTime}</div>
                            </div>
                        ))}
                    </div>

                    {DAYS.map((day) => (
                        <div key={day} className="grid divide-x border-white/5 border-b last:border-0 hover:bg-white/5 transition-colors" style={{ gridTemplateColumns: gridTemplateCols }}>

                            <div className="p-3 font-medium text-sm flex items-center justify-center bg-muted/10">
                                {day}
                            </div>
                            {timeSlots.map((period, i) => {
                                if (period.type === "break") {
                                    return (
                                        <div key={i} className="relative bg-amber-500/5 dark:bg-amber-500/20 flex items-center justify-center p-2 border-r border-amber-500/20 shadow-[inset_0_0_20px_rgba(245,158,11,0.1)] dark:shadow-[inset_0_0_30px_rgba(245,158,11,0.2)]">
                                            {/* White Glowing Center Line */}
                                            <div className="h-full w-[2px] rounded-full bg-white shadow-[0_0_15px_rgba(245,158,11,0.8)] dark:shadow-[0_0_20px_rgba(245,158,11,1)] opacity-80 dark:opacity-100"></div>
                                        </div>
                                    )
                                }

                                const slot = currentSlots.find(s => s.day === day && s.startTime === period.startTime)

                                return (
                                    <div
                                        key={i}
                                        className="p-1 h-24 relative group cursor-pointer transition-colors hover:bg-muted/20"
                                        onClick={() => handleCellClick(day, period.startTime, period.endTime)}
                                    >
                                        {slot ? (
                                            <div className="h-full w-full rounded bg-primary/10 border border-primary/20 p-2 flex flex-col justify-between shadow-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                                <div>
                                                    <div className="font-bold text-xs truncate text-primary">{slot.courseName}</div>
                                                    <div className="text-[10px] text-muted-foreground">{slot.courseCode}</div>
                                                </div>
                                                <div className="flex justify-between items-end">
                                                    <Badge variant="outline" className="text-[10px] h-4 px-1 bg-background/50 backdrop-blur-sm">{slot.room}</Badge>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="h-full w-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Plus className="h-4 w-4 text-muted-foreground" />
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    ))}
                </div>
            </div>

            <Dialog open={isSlotDialogOpen} onOpenChange={setIsSlotDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingSlot?.id ? "Edit Slot" : "Schedule Class"}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSaveSlot} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Day</Label>
                                <Input value={editingSlot?.day} disabled />
                            </div>
                            <div className="space-y-2">
                                <Label>Time</Label>
                                <Input value={`${editingSlot?.startTime} - ${editingSlot?.endTime}`} disabled />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Subject Name</Label>
                            <Input name="courseName" defaultValue={editingSlot?.courseName} required placeholder="e.g. Data Structures" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Subject Code</Label>
                                <Input name="courseCode" defaultValue={editingSlot?.courseCode} required placeholder="CS101" />
                            </div>
                            <div className="space-y-2">
                                <Label>Room</Label>
                                <Input name="room" defaultValue={editingSlot?.room} required placeholder="Lab 1" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Teacher</Label>
                            <Select name="teacherId" defaultValue={editingSlot?.teacherId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Faculty" />
                                </SelectTrigger>
                                <SelectContent>
                                    {teachers.map(t => (
                                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <DialogFooter className="gap-2">
                            {editingSlot?.id && (
                                <Button type="button" variant="destructive" onClick={handleDeleteSlot}>
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Clear Slot
                                </Button>
                            )}
                            <Button type="submit">Save Class</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
