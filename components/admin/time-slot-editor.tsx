"use client"

import { useState } from "react"
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
    DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Clock, Plus, Trash2, Save } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { updateTimeSlots, TimeSlotConfig } from "@/app/actions/admin"

interface TimeSlotEditorProps {
    initialSlots: TimeSlotConfig[]
}

// Helper to sort slots by start time
const sortSlots = (slots: TimeSlotConfig[]) => {
    return [...slots].sort((a, b) => a.startTime.localeCompare(b.startTime))
}

export function TimeSlotEditor({ initialSlots }: TimeSlotEditorProps) {
    const [open, setOpen] = useState(false)
    const [slots, setSlots] = useState<TimeSlotConfig[]>(initialSlots)
    const [isLoading, setIsLoading] = useState(false)
    const { toast } = useToast()
    const router = useRouter()

    const handleAddSlot = () => {
        setSlots([...slots, {
            id: Date.now(), // Temp ID
            startTime: "12:00",
            endTime: "13:00",
            label: "New Slot",
            type: "class"
        }])
    }

    const handleRemoveSlot = (index: number) => {
        const newSlots = [...slots]
        newSlots.splice(index, 1)
        setSlots(newSlots)
    }

    const handleChange = (index: number, field: keyof TimeSlotConfig, value: string) => {
        const newSlots = [...slots]
        newSlots[index] = { ...newSlots[index], [field]: value }
        setSlots(newSlots)
    }

    const handleSave = async () => {
        setIsLoading(true)
        try {
            const sorted = sortSlots(slots)
            await updateTimeSlots(sorted)
            toast({ title: "Updated", description: "Time slots configuration saved." })
            setOpen(false)
            router.refresh()
        } catch (e) {
            toast({ title: "Error", description: "Failed to save settings.", variant: "destructive" })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline">
                    <Clock className="mr-2 h-4 w-4" />
                    Configure Timings
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Configure Bell Schedule</DialogTitle>
                    <DialogDescription>
                        Define the start and end times for each period.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="flex justify-between items-center text-sm font-medium text-muted-foreground px-1">
                        <span className="w-20">Start</span>
                        <span className="w-20">End</span>
                        <span className="flex-1 px-4">Label</span>
                        <span className="w-24">Type</span>
                        <span className="w-8"></span>
                    </div>

                    {slots.map((slot, i) => (
                        <div key={i} className="flex gap-2 items-center">
                            <Input
                                type="time"
                                value={slot.startTime}
                                onChange={(e) => handleChange(i, "startTime", e.target.value)}
                                className="w-24"
                            />
                            <span className="text-muted-foreground">-</span>
                            <Input
                                type="time"
                                value={slot.endTime}
                                onChange={(e) => handleChange(i, "endTime", e.target.value)}
                                className="w-24"
                            />
                            <Input
                                type="text"
                                value={slot.label}
                                onChange={(e) => handleChange(i, "label", e.target.value)}
                                className="flex-1"
                                placeholder="Slot Name"
                            />
                            <Select
                                value={slot.type}
                                onValueChange={(v) => handleChange(i, "type", v as "class" | "break")}
                            >
                                <SelectTrigger className="w-24">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="class">Class</SelectItem>
                                    <SelectItem value="break">Break</SelectItem>
                                </SelectContent>
                            </Select>
                            <Button variant="ghost" size="icon" onClick={() => handleRemoveSlot(i)} className="text-destructive">
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}

                    {slots.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground border border-dashed rounded-md">
                            No time slots defined.
                        </div>
                    )}

                    <Button variant="outline" onClick={handleAddSlot} className="w-full border-dashed">
                        <Plus className="mr-2 h-4 w-4" />
                        Add Time Slot
                    </Button>
                </div>

                <DialogFooter>
                    <Button onClick={handleSave} disabled={isLoading}>
                        <Save className="mr-2 h-4 w-4" />
                        Save Configuration
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
