"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Settings, Plus, Trash2 } from "lucide-react"
import { createCollegeSlot, updateCollegeSlot, deleteCollegeSlot, getCollegeSlots } from "@/app/actions/class-slots"
import { ClassSlot } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

interface TimeSlotConfigDialogProps {
    initialSlots: any[] // From old admin.ts
}

export function TimeSlotConfigDialog({ initialSlots }: TimeSlotConfigDialogProps) {
    const [open, setOpen] = useState(false)
    const [slots, setSlots] = useState<ClassSlot[]>([])
    const [loading, setLoading] = useState(false)
    const { toast } = useToast()
    const router = useRouter()

    // Load actual college slots when dialog opens
    const handleOpenChange = async (isOpen: boolean) => {
        setOpen(isOpen)
        if (isOpen) {
            setLoading(true)
            try {
                const collegeSlots = await getCollegeSlots()
                setSlots(collegeSlots)
            } catch (error) {
                console.error("Failed to load slots:", error)
                toast({
                    title: "Error",
                    description: "Failed to load time slots",
                    variant: "destructive"
                })
            } finally {
                setLoading(false)
            }
        }
    }

    const handleAddSlot = () => {
        const maxSlotNumber = slots.length > 0 ? Math.max(...slots.map(s => s.slotNumber)) : 0
        const newSlot: ClassSlot = {
            id: `temp-${Date.now()}`, // Temporary ID
            slotNumber: maxSlotNumber + 1,
            startTime: "09:00",
            endTime: "10:00",
            duration: 60,
            type: "CLASS",
            isActive: true,
            organizationId: "", // Will be set by server
            createdAt: new Date()
        }
        setSlots([...slots, newSlot])
    }

    const handleDeleteSlot = async (index: number, slotId: string) => {
        // If it's a temporary slot (not saved yet), just remove from array
        if (slotId.startsWith('temp-')) {
            const newSlots = [...slots]
            newSlots.splice(index, 1)
            setSlots(newSlots)
            return
        }

        // Otherwise, delete from database
        try {
            const result = await deleteCollegeSlot(slotId, true) // Force delete
            if (result.success) {
                const newSlots = [...slots]
                newSlots.splice(index, 1)
                setSlots(newSlots)
                toast({
                    title: "Slot Deleted",
                    description: result.message || "Slot deleted successfully"
                })
            } else {
                toast({
                    title: "Error",
                    description: result.error || "Failed to delete slot",
                    variant: "destructive"
                })
            }
        } catch (error) {
            console.error(error)
            toast({
                title: "Error",
                description: "Failed to delete slot",
                variant: "destructive"
            })
        }
    }

    const handleChange = (index: number, field: keyof ClassSlot, value: any) => {
        const newSlots = [...slots]
        newSlots[index] = { ...newSlots[index], [field]: value }

        // Auto-calculate duration when times change
        if (field === 'startTime' || field === 'endTime') {
            const start = new Date(`2000-01-01 ${newSlots[index].startTime}`)
            const end = new Date(`2000-01-01 ${newSlots[index].endTime}`)
            const duration = Math.round((end.getTime() - start.getTime()) / 60000)
            newSlots[index].duration = duration
        }

        setSlots(newSlots)
    }

    const handleSave = async () => {
        setLoading(true)
        try {
            // Save each slot
            for (const slot of slots) {
                if (slot.id.startsWith('temp-')) {
                    // Create new slot
                    await createCollegeSlot({
                        startTime: slot.startTime,
                        endTime: slot.endTime,
                        type: slot.type
                    })
                } else {
                    // Update existing slot
                    await updateCollegeSlot(slot.id, {
                        startTime: slot.startTime,
                        endTime: slot.endTime,
                        type: slot.type
                    })
                }
            }

            toast({
                title: "Configuration Saved",
                description: "Master time slots updated successfully"
            })
            setOpen(false)
            router.refresh()
        } catch (error) {
            console.error(error)
            toast({
                title: "Error",
                description: "Failed to save configuration",
                variant: "destructive"
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button variant="outline">
                    <Settings className="mr-2 h-4 w-4" />
                    Configure Slots
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Master Time Slot Configuration</DialogTitle>
                    <DialogDescription>
                        Define organization-wide time slots. These slots will be available for all classes to map their subjects.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {loading && slots.length === 0 ? (
                        <div className="flex items-center justify-center h-32">
                            <div className="h-8 w-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                        </div>
                    ) : (
                        <>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[80px]">Slot #</TableHead>
                                        <TableHead className="w-[120px]">Start Time</TableHead>
                                        <TableHead className="w-[120px]">End Time</TableHead>
                                        <TableHead className="w-[100px]">Duration</TableHead>
                                        <TableHead className="w-[120px]">Type</TableHead>
                                        <TableHead className="w-[50px]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {slots.map((slot, index) => (
                                        <TableRow key={slot.id}>
                                            <TableCell className="font-mono text-sm">
                                                {slot.slotNumber}
                                            </TableCell>
                                            <TableCell>
                                                <Input
                                                    type="time"
                                                    value={slot.startTime}
                                                    onChange={(e) => handleChange(index, 'startTime', e.target.value)}
                                                    className="h-8"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Input
                                                    type="time"
                                                    value={slot.endTime}
                                                    onChange={(e) => handleChange(index, 'endTime', e.target.value)}
                                                    className="h-8"
                                                />
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {slot.duration} min
                                            </TableCell>
                                            <TableCell>
                                                <Select
                                                    value={slot.type}
                                                    onValueChange={(val: any) => handleChange(index, 'type', val)}
                                                >
                                                    <SelectTrigger className="h-8">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="CLASS">Class</SelectItem>
                                                        <SelectItem value="BREAK">Break</SelectItem>
                                                        <SelectItem value="LUNCH">Lunch</SelectItem>
                                                        <SelectItem value="FREE">Free</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                            <TableCell>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-destructive"
                                                    onClick={() => handleDeleteSlot(index, slot.id)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>

                            <Button variant="outline" onClick={handleAddSlot} className="w-full border-dashed">
                                <Plus className="mr-2 h-4 w-4" /> Add Slot
                            </Button>
                        </>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button onClick={handleSave} disabled={loading}>
                        {loading ? "Saving..." : "Save Changes"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
