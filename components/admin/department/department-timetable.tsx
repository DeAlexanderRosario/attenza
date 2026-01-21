"use client"

import * as React from "react"
import { Slot, Class } from "@/lib/types"
import { createSlot, updateSlot, deleteSlot } from "@/app/actions/teachers"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Calendar, Clock, MapPin, User, Plus, BookOpen, Users, Edit2, Trash2, Grid3x3, List } from "lucide-react"
import { useRouter } from "next/navigation"

interface DepartmentTimetableProps {
    slots: Slot[]
    departmentCode: string
    classes: Class[]
}

export function DepartmentTimetable({ slots: initialSlots, departmentCode, classes }: DepartmentTimetableProps) {
    const [slots, setSlots] = React.useState(initialSlots)
    const [dialogOpen, setDialogOpen] = React.useState(false)
    const [editingSlot, setEditingSlot] = React.useState<Slot | null>(null)
    const [deleteSlotId, setDeleteSlotId] = React.useState<string | null>(null)
    const [loading, setLoading] = React.useState(false)
    const [viewMode, setViewMode] = React.useState<"list" | "grid">("list")
    const [formData, setFormData] = React.useState({
        courseName: "",
        courseCode: "",
        teacherId: "",
        classId: "",
        day: "",
        startTime: "",
        endTime: ""
    })
    const router = useRouter()

    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

    // Group slots by day
    const slotsByDay = days.map(day => ({
        day,
        slots: slots.filter(s => s.day === day).sort((a, b) => a.startTime.localeCompare(b.startTime))
    }))

    const statusColors = {
        "Scheduled": "bg-primary/10 text-primary border-primary/20",
        "Ongoing": "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
        "Completed": "bg-muted text-muted-foreground",
        "Cancelled": "bg-destructive/10 text-destructive border-destructive/20",
    }

    // Get selected class for room display
    const selectedClass = classes?.find(c => c.id === formData.classId)

    const openEditDialog = (slot: Slot) => {
        setEditingSlot(slot)
        setFormData({
            courseName: slot.courseName,
            courseCode: slot.courseCode,
            teacherId: slot.teacherId,
            classId: slot.classId || "",
            day: slot.day,
            startTime: slot.startTime,
            endTime: slot.endTime
        })
        setDialogOpen(true)
    }

    const closeDialog = () => {
        setDialogOpen(false)
        setEditingSlot(null)
        setFormData({
            courseName: "",
            courseCode: "",
            teacherId: "",
            classId: "",
            day: "",
            startTime: "",
            endTime: ""
        })
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            if (editingSlot) {
                // Update existing slot
                const result = await updateSlot(editingSlot.id, formData)
                if (result.success) {
                    router.refresh()
                    closeDialog()
                    // Optimistic update
                    setSlots(slots.map(s => s.id === editingSlot.id ? { ...s, ...formData } : s))
                } else {
                    alert(result.error || "Failed to update slot")
                }
            } else {
                // Create new slot
                const result = await createSlot(formData)
                if (result.success && result.slot) {
                    router.refresh()
                    closeDialog()
                    setSlots([...slots, result.slot])
                } else {
                    alert("Failed to create slot")
                }
            }
        } catch (error) {
            console.error("Failed to save slot:", error)
            alert("Failed to save timetable slot. Please try again.")
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async () => {
        if (!deleteSlotId) return

        setLoading(true)
        try {
            const result = await deleteSlot(deleteSlotId)

            if (result.success) {
                setSlots(slots.filter(s => s.id !== deleteSlotId))
                setDeleteSlotId(null)
                router.refresh()
            } else if (result.error) {
                alert(result.error)
            }
        } catch (error) {
            console.error("Failed to delete slot:", error)
            alert("Failed to delete slot. Please try again.")
        } finally {
            setLoading(false)
        }
    }

    if (slots.length === 0) {
        return (
            <>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-center py-12 text-muted-foreground">
                            <Calendar className="mx-auto h-12 w-12 mb-4 opacity-50" />
                            <p className="text-lg font-medium mb-2">No timetable slots found</p>
                            <p className="text-sm mb-6">Add your first class schedule for {departmentCode} department</p>
                            <Button onClick={() => setDialogOpen(true)}>
                                <Plus className="mr-2 h-4 w-4" />
                                Add First Slot
                            </Button>
                        </div>
                    </CardContent>
                </Card>
                <SlotDialog
                    open={dialogOpen}
                    onClose={closeDialog}
                    formData={formData}
                    setFormData={setFormData}
                    selectedClass={selectedClass}
                    classes={classes}
                    onSubmit={handleSubmit}
                    loading={loading}
                    days={days}
                    isEditing={!!editingSlot}
                />
            </>
        )
    }

    return (
        <>
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-semibold">Weekly Timetable</h3>
                        <p className="text-sm text-muted-foreground">{slots.length} total slots scheduled</p>
                    </div>
                    <div className="flex gap-2">
                        <div className="flex border rounded-lg">
                            <Button
                                variant={viewMode === "list" ? "default" : "ghost"}
                                size="sm"
                                onClick={() => setViewMode("list")}
                            >
                                <List className="h-4 w-4" />
                            </Button>
                            <Button
                                variant={viewMode === "grid" ? "default" : "ghost"}
                                size="sm"
                                onClick={() => setViewMode("grid")}
                            >
                                <Grid3x3 className="h-4 w-4" />
                            </Button>
                        </div>
                        <Button onClick={() => setDialogOpen(true)}>
                            <Plus className="mr-2 h-4 w-4" />
                            Add Slot
                        </Button>
                    </div>
                </div>

                {slotsByDay.map(({ day, slots: daySlots }) => (
                    daySlots.length > 0 && (
                        <Card key={day} className="border-l-4 border-l-primary">
                            <CardHeader className="bg-gradient-to-r from-background to-muted/20">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Calendar className="h-5 w-5" />
                                    {day}
                                    <Badge variant="secondary" className="ml-auto">{daySlots.length} classes</Badge>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-4">
                                <div className={`grid gap-3 ${viewMode === "grid" ? "md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"}`}>
                                    {daySlots.map(slot => {
                                        const slotClass = classes?.find(c => c.id === slot.classId)
                                        return (
                                            <div
                                                key={slot.id}
                                                className="group p-4 rounded-lg border bg-card hover:shadow-md hover:border-primary/50 transition-all duration-200"
                                            >
                                                <div className="flex items-start justify-between mb-3">
                                                    <div className="flex-1">
                                                        <div className="font-semibold text-base truncate group-hover:text-primary transition-colors">
                                                            {slot.courseName}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground">{slot.courseCode}</div>
                                                    </div>
                                                    <div className="flex gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8"
                                                            onClick={() => openEditDialog(slot)}
                                                        >
                                                            <Edit2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-destructive"
                                                            onClick={() => setDeleteSlotId(slot.id)}
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </div>
                                                </div>
                                                <div className="space-y-2 text-sm">
                                                    <div className="flex items-center gap-2 text-muted-foreground">
                                                        <Clock className="h-3.5 w-3.5" />
                                                        <span className="font-medium">{slot.startTime} - {slot.endTime}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-muted-foreground">
                                                        <MapPin className="h-3.5 w-3.5" />
                                                        <span>{slot.room || "No room"}</span>
                                                    </div>
                                                    {slotClass && (
                                                        <div className="flex items-center gap-2 text-muted-foreground">
                                                            <Users className="h-3.5 w-3.5" />
                                                            <span>{slotClass.name}</span>
                                                        </div>
                                                    )}
                                                    <div className="mt-2 pt-2 border-t flex items-center justify-between">
                                                        <span className="text-xs font-medium text-muted-foreground">
                                                            Teacher: {slot.teacherId}
                                                        </span>
                                                        <Badge
                                                            variant="secondary"
                                                            className={statusColors[slot.status as keyof typeof statusColors] || ""}
                                                        >
                                                            {slot.status}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    )
                ))}
            </div>

            <SlotDialog
                open={dialogOpen}
                onClose={closeDialog}
                formData={formData}
                setFormData={setFormData}
                selectedClass={selectedClass}
                classes={classes}
                onSubmit={handleSubmit}
                loading={loading}
                days={days}
                isEditing={!!editingSlot}
            />

            <AlertDialog open={!!deleteSlotId} onOpenChange={(open) => !open && setDeleteSlotId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Timetable Slot?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the timetable slot.
                            {slots.find(s => s.id === deleteSlotId)?.status === "Completed" && (
                                <span className="block mt-2 text-yellow-600 font-medium">
                                    ⚠️ This slot has been completed and may have attendance records.
                                </span>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                            {loading ? "Deleting..." : "Delete"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}

function SlotDialog({ open, onClose, formData, setFormData, selectedClass, classes, onSubmit, loading, days, isEditing }: any) {
    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{isEditing ? "Edit Timetable Slot" : "Add Timetable Slot"}</DialogTitle>
                    <DialogDescription>
                        {isEditing ? "Update the class schedule entry" : "Create a new class schedule entry"}. Room will be auto-filled from the selected class.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={onSubmit}>
                    <div className="grid gap-4 py-4">
                        {/* Course Info */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="courseName">
                                    <BookOpen className="inline h-3 w-3 mr-1" />
                                    Course Name *
                                </Label>
                                <Input
                                    id="courseName"
                                    placeholder="e.g., Database Management Systems"
                                    value={formData.courseName}
                                    onChange={(e) => setFormData({ ...formData, courseName: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="courseCode">Course Code *</Label>
                                <Input
                                    id="courseCode"
                                    placeholder="e.g., CS301"
                                    value={formData.courseCode}
                                    onChange={(e) => setFormData({ ...formData, courseCode: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        {/* Class Selection */}
                        <div className="grid gap-2">
                            <Label htmlFor="classId">
                                <Users className="inline h-3 w-3 mr-1" />
                                Select Class *
                            </Label>
                            <Select value={formData.classId} onValueChange={(v) => setFormData({ ...formData, classId: v })}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Choose a class..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {classes?.map((cls: Class) => (
                                        <SelectItem key={cls.id} value={cls.id}>
                                            {cls.name} - Room: {cls.roomNumber || "Not set"}
                                        </SelectItem>
                                    ))}
                                    {(!classes || classes.length === 0) && (
                                        <div className="p-2 text-sm text-muted-foreground text-center">
                                            No classes found. Please add a class first.
                                        </div>
                                    )}
                                </SelectContent>
                            </Select>
                            {selectedClass && (
                                <div className="rounded-lg bg-muted/50 p-3 mt-2">
                                    <div className="text-sm space-y-1">
                                        <p><strong>Class:</strong> {selectedClass.name}</p>
                                        <p><strong>Room:</strong> {selectedClass.roomNumber || "Not assigned"}</p>
                                        {selectedClass.location && <p><strong>Location:</strong> {selectedClass.location}</p>}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Teacher */}
                        <div className="grid gap-2">
                            <Label htmlFor="teacherId">Teacher ID *</Label>
                            <Input
                                id="teacherId"
                                placeholder="e.g., teacher-1"
                                value={formData.teacherId}
                                onChange={(e) => setFormData({ ...formData, teacherId: e.target.value })}
                                required
                            />
                        </div>

                        {/* Schedule */}
                        <div className="grid grid-cols-3 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="day">
                                    <Calendar className="inline h-3 w-3 mr-1" />
                                    Day *
                                </Label>
                                <Select value={formData.day} onValueChange={(v) => setFormData({ ...formData, day: v })}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select day" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {days.map((d: string) => (
                                            <SelectItem key={d} value={d}>{d}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="startTime">
                                    <Clock className="inline h-3 w-3 mr-1" />
                                    Start Time *
                                </Label>
                                <Input
                                    id="startTime"
                                    type="time"
                                    value={formData.startTime}
                                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="endTime">End Time *</Label>
                                <Input
                                    id="endTime"
                                    type="time"
                                    value={formData.endTime}
                                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                                    required
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading || !formData.classId}>
                            {loading ? (isEditing ? "Updating..." : "Creating...") : (isEditing ? "Update Slot" : "Create Slot")}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
