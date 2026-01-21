"use client"

import * as React from "react"
import { ClassSlot } from "@/lib/types"
import { getCollegeSlots, createCollegeSlot, updateCollegeSlot, deleteCollegeSlot } from "@/app/actions/class-slots"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
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
import { Badge } from "@/components/ui/badge"
import { Clock, Plus, Edit2, Trash2, GripVertical } from "lucide-react"
import { useRouter } from "next/navigation"

export function SlotConfigurationTable() {
    const [slots, setSlots] = React.useState<ClassSlot[]>([])
    const [loading, setLoading] = React.useState(false)
    const [dialogOpen, setDialogOpen] = React.useState(false)
    const [editingSlot, setEditingSlot] = React.useState<ClassSlot | null>(null)
    const [deleteSlotId, setDeleteSlotId] = React.useState<string | null>(null)
    const [formData, setFormData] = React.useState({
        startTime: "",
        endTime: "",
        type: "CLASS" as "CLASS" | "BREAK" | "LUNCH" | "FREE"
    })
    const router = useRouter()

    // Load slots
    React.useEffect(() => {
        const fetchSlots = async () => {
            setLoading(true)
            try {
                const data = await getCollegeSlots()
                setSlots(data)
            } catch (error) {
                console.error("Failed to load slots:", error)
            } finally {
                setLoading(false)
            }
        }
        fetchSlots()
    }, [])

    const openDialog = (slot?: ClassSlot) => {
        setEditingSlot(slot || null)
        setFormData({
            startTime: slot?.startTime || "",
            endTime: slot?.endTime || "",
            type: slot?.type || "CLASS"
        })
        setDialogOpen(true)
    }

    const closeDialog = () => {
        setDialogOpen(false)
        setEditingSlot(null)
        setFormData({
            startTime: "",
            endTime: "",
            type: "CLASS"
        })
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            let result
            if (editingSlot) {
                result = await updateCollegeSlot(editingSlot.id, formData)
            } else {
                result = await createCollegeSlot(formData)
            }

            if (result.success) {
                const updated = await getCollegeSlots()
                setSlots(updated)
                closeDialog()
                router.refresh()
            } else {
                alert(result.error || "Failed to save slot")
            }
        } catch (error) {
            console.error("Save failed:", error)
            alert("Failed to save slot")
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async () => {
        if (!deleteSlotId) return

        setLoading(true)
        try {
            const result = await deleteCollegeSlot(deleteSlotId)
            if (result.success) {
                const updated = await getCollegeSlots()
                setSlots(updated)
                setDeleteSlotId(null)
                router.refresh()
            } else {
                alert(result.error || "Failed to delete slot")
            }
        } catch (error) {
            console.error("Delete failed:", error)
        } finally {
            setLoading(false)
        }
    }

    const typeColors = {
        "CLASS": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
        "BREAK": "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
        "LUNCH": "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
        "FREE": "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
    }

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <Clock className="h-5 w-5" />
                                College-Wide Time Slots
                            </CardTitle>
                            <p className="text-sm text-muted-foreground mt-1">
                                Configure time slots used across all classes
                            </p>
                        </div>
                        <Button onClick={() => openDialog()}>
                            <Plus className="mr-2 h-4 w-4" />
                            Add Slot
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading && slots.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            Loading slots...
                        </div>
                    ) : slots.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <Clock className="mx-auto h-12 w-12 mb-4 opacity-50" />
                            <p className="text-lg font-medium mb-2">No time slots configured</p>
                            <p className="text-sm mb-4">Add your first time slot to get started</p>
                            <Button onClick={() => openDialog()}>
                                <Plus className="mr-2 h-4 w-4" />
                                Add First Slot
                            </Button>
                        </div>
                    ) : (
                        <div className="rounded-lg border overflow-hidden">
                            <table className="w-full">
                                <thead className="bg-muted/50">
                                    <tr>
                                        <th className="p-3 text-left w-12">#</th>
                                        <th className="p-3 text-left">Start Time</th>
                                        <th className="p-3 text-left">End Time</th>
                                        <th className="p-3 text-left">Duration</th>
                                        <th className="p-3 text-left">Type</th>
                                        <th className="p-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {slots.map((slot) => (
                                        <tr key={slot.id} className="hover:bg-muted/30 transition-colors">
                                            <td className="p-3">
                                                <div className="flex items-center gap-2 text-muted-foreground">
                                                    <GripVertical className="h-4 w-4" />
                                                    <span className="font-semibold">{slot.slotNumber}</span>
                                                </div>
                                            </td>
                                            <td className="p-3">
                                                <div className="flex items-center gap-2">
                                                    <Clock className="h-4 w-4 text-muted-foreground" />
                                                    <span className="font-medium">{slot.startTime}</span>
                                                </div>
                                            </td>
                                            <td className="p-3">
                                                <div className="flex items-center gap-2">
                                                    <Clock className="h-4 w-4 text-muted-foreground" />
                                                    <span className="font-medium">{slot.endTime}</span>
                                                </div>
                                            </td>
                                            <td className="p-3">
                                                <span className="text-sm text-muted-foreground">
                                                    {slot.duration} min
                                                </span>
                                            </td>
                                            <td className="p-3">
                                                <Badge
                                                    variant="secondary"
                                                    className={typeColors[slot.type]}
                                                >
                                                    {slot.type}
                                                </Badge>
                                            </td>
                                            <td className="p-3 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => openDialog(slot)}
                                                    >
                                                        <Edit2 className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-destructive"
                                                        onClick={() => setDeleteSlotId(slot.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Add/Edit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingSlot ? "Edit" : "Add"} Time Slot</DialogTitle>
                        <DialogDescription>
                            {editingSlot ? "Update the time slot configuration" : "Create a new time slot for the college schedule"}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSave}>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
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
                            <div className="grid gap-2">
                                <Label htmlFor="type">Slot Type *</Label>
                                <Select
                                    value={formData.type}
                                    onValueChange={(v: any) => setFormData({ ...formData, type: v })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="CLASS">
                                            <div className="flex items-center gap-2">
                                                <div className="h-2 w-2 rounded-full bg-blue-500" />
                                                CLASS - Regular teaching period
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="BREAK">
                                            <div className="flex items-center gap-2">
                                                <div className="h-2 w-2 rounded-full bg-green-500" />
                                                BREAK - Short break
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="LUNCH">
                                            <div className="flex items-center gap-2">
                                                <div className="h-2 w-2 rounded-full bg-orange-500" />
                                                LUNCH - Lunch break
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="FREE">
                                            <div className="flex items-center gap-2">
                                                <div className="h-2 w-2 rounded-full bg-gray-500" />
                                                FREE - Free period
                                            </div>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={closeDialog}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={loading}>
                                {loading ? "Saving..." : editingSlot ? "Update Slot" : "Create Slot"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <AlertDialog open={!!deleteSlotId} onOpenChange={(open) => !open && setDeleteSlotId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Time Slot?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete this time slot. If any timetable entries are using this slot, deletion will be prevented.
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
        </div>
    )
}
