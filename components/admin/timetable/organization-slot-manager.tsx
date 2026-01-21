"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, Plus, Trash2, Edit, Coffee, BookOpen, Utensils } from "lucide-react"
import { getCollegeSlots, deleteCollegeSlot, getSlotUsageStats } from "@/app/actions/class-slots"
import { ClassSlot } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"
import { SlotDeletionDialog } from "./slot-deletion-dialog"
import { cn } from "@/lib/utils"

interface SlotUsageStat {
    slotId: string
    slotNumber: number
    startTime: string
    endTime: string
    type: "CLASS" | "BREAK" | "LUNCH" | "FREE"
    totalEntries: number
    classesCount: number
    isUsed: boolean
}

export function OrganizationSlotManager() {
    const [slots, setSlots] = useState<ClassSlot[]>([])
    const [usageStats, setUsageStats] = useState<SlotUsageStat[]>([])
    const [loading, setLoading] = useState(true)
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [selectedSlot, setSelectedSlot] = useState<{
        slot: ClassSlot
        stats: SlotUsageStat
        affectedClasses: any[]
    } | null>(null)

    const { toast } = useToast()

    const loadData = async () => {
        setLoading(true)
        try {
            const [slotsData, statsData] = await Promise.all([
                getCollegeSlots(),
                getSlotUsageStats()
            ])
            setSlots(slotsData)
            setUsageStats(statsData)
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

    useEffect(() => {
        loadData()
    }, [])

    const handleDeleteClick = async (slot: ClassSlot) => {
        const stats = usageStats.find(s => s.slotId === slot.id)
        if (!stats) return

        // Try to delete first to get affected classes info
        const result = await deleteCollegeSlot(slot.id, false)

        if (!result.success && result.hasEntries) {
            setSelectedSlot({
                slot,
                stats,
                affectedClasses: result.affectedClasses || []
            })
            setDeleteDialogOpen(true)
        } else if (result.success) {
            toast({
                title: "Success",
                description: result.message || "Slot deleted successfully"
            })
            loadData()
        }
    }

    const handleConfirmDelete = async () => {
        if (!selectedSlot) return

        const result = await deleteCollegeSlot(selectedSlot.slot.id, true)

        if (result.success) {
            toast({
                title: "Success",
                description: result.message || "Slot deleted successfully"
            })
            loadData()
        } else {
            toast({
                title: "Error",
                description: result.error || "Failed to delete slot",
                variant: "destructive"
            })
        }
    }

    const getSlotIcon = (type: string) => {
        switch (type) {
            case "BREAK":
                return <Coffee className="h-4 w-4" />
            case "LUNCH":
                return <Utensils className="h-4 w-4" />
            case "CLASS":
                return <BookOpen className="h-4 w-4" />
            default:
                return <Clock className="h-4 w-4" />
        }
    }

    const getSlotColor = (type: string) => {
        switch (type) {
            case "BREAK":
                return "bg-orange-100 dark:bg-orange-950 border-orange-300 dark:border-orange-800"
            case "LUNCH":
                return "bg-amber-100 dark:bg-amber-950 border-amber-300 dark:border-amber-800"
            case "CLASS":
                return "bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-900"
            default:
                return "bg-gray-50 dark:bg-gray-950 border-gray-200 dark:border-gray-800"
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="h-8 w-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
        )
    }

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Organization Time Slots</CardTitle>
                            <CardDescription>
                                Manage organization-wide time slots. Each class can map different subjects to these slots.
                            </CardDescription>
                        </div>
                        <Button>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Slot
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {slots.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground">
                                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                <p>No time slots configured yet</p>
                                <p className="text-sm">Add your first slot to get started</p>
                            </div>
                        ) : (
                            slots.map((slot) => {
                                const stats = usageStats.find(s => s.slotId === slot.id)
                                return (
                                    <div
                                        key={slot.id}
                                        className={cn(
                                            "flex items-center justify-between p-4 rounded-lg border-2 transition-all hover:shadow-md",
                                            getSlotColor(slot.type)
                                        )}
                                    >
                                        <div className="flex items-center gap-4 flex-1">
                                            <div className="flex items-center justify-center h-10 w-10 rounded-full bg-background/50">
                                                {getSlotIcon(slot.type)}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3">
                                                    <h4 className="font-semibold">
                                                        Slot {slot.slotNumber}
                                                    </h4>
                                                    <Badge variant="outline" className="font-mono text-xs">
                                                        {slot.startTime} - {slot.endTime}
                                                    </Badge>
                                                    <Badge variant="secondary" className="text-xs">
                                                        {slot.type}
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                                                    <span>{slot.duration} minutes</span>
                                                    {stats && stats.isUsed && (
                                                        <>
                                                            <span>•</span>
                                                            <span>
                                                                Used by <strong>{stats.classesCount}</strong> {stats.classesCount === 1 ? "class" : "classes"}
                                                            </span>
                                                            <span>•</span>
                                                            <span>
                                                                <strong>{stats.totalEntries}</strong> {stats.totalEntries === 1 ? "entry" : "entries"}
                                                            </span>
                                                        </>
                                                    )}
                                                    {stats && !stats.isUsed && (
                                                        <>
                                                            <span>•</span>
                                                            <span className="text-muted-foreground/60">Not used</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button variant="ghost" size="sm">
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDeleteClick(slot)}
                                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </CardContent>
            </Card>

            {selectedSlot && (
                <SlotDeletionDialog
                    open={deleteDialogOpen}
                    onOpenChange={setDeleteDialogOpen}
                    slotId={selectedSlot.slot.id}
                    slotLabel={`Slot ${selectedSlot.slot.slotNumber}`}
                    slotTime={`${selectedSlot.slot.startTime} - ${selectedSlot.slot.endTime}`}
                    affectedClasses={selectedSlot.affectedClasses}
                    entriesCount={selectedSlot.stats.totalEntries}
                    onConfirmDelete={handleConfirmDelete}
                />
            )}
        </>
    )
}
