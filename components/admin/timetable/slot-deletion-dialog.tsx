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
} from "@/components/ui/dialog"
import { AlertTriangle, Trash2, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface AffectedClass {
    id: string
    name: string
}

interface SlotDeletionDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    slotId: string
    slotLabel: string
    slotTime: string
    affectedClasses: AffectedClass[]
    entriesCount: number
    onConfirmDelete: () => Promise<void>
}

export function SlotDeletionDialog({
    open,
    onOpenChange,
    slotId,
    slotLabel,
    slotTime,
    affectedClasses,
    entriesCount,
    onConfirmDelete
}: SlotDeletionDialogProps) {
    const [isDeleting, setIsDeleting] = useState(false)

    const handleDelete = async () => {
        setIsDeleting(true)
        try {
            await onConfirmDelete()
            onOpenChange(false)
        } catch (error) {
            console.error("Delete failed:", error)
        } finally {
            setIsDeleting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
                            <AlertTriangle className="h-5 w-5 text-destructive" />
                        </div>
                        <div>
                            <DialogTitle>Delete Time Slot?</DialogTitle>
                            <DialogDescription className="mt-1">
                                This action cannot be undone
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Slot Info */}
                    <div className="rounded-lg border bg-muted/50 p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-semibold">{slotLabel}</p>
                                <p className="text-sm text-muted-foreground font-mono">{slotTime}</p>
                            </div>
                            <Badge variant="outline" className="font-mono">
                                ID: {slotId.slice(0, 8)}
                            </Badge>
                        </div>
                    </div>

                    {/* Warning Alert */}
                    {entriesCount > 0 && (
                        <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>
                                <strong>Warning:</strong> Deleting this slot will permanently remove{" "}
                                <strong>{entriesCount} timetable {entriesCount === 1 ? "entry" : "entries"}</strong>{" "}
                                across <strong>{affectedClasses.length} {affectedClasses.length === 1 ? "class" : "classes"}</strong>.
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Affected Classes List */}
                    {affectedClasses.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-sm font-medium text-muted-foreground">
                                Affected Classes:
                            </p>
                            <div className="max-h-40 overflow-y-auto rounded-md border bg-background p-3 space-y-1">
                                {affectedClasses.map((cls) => (
                                    <div
                                        key={cls.id}
                                        className="flex items-center gap-2 text-sm py-1"
                                    >
                                        <div className="h-1.5 w-1.5 rounded-full bg-destructive" />
                                        <span>{cls.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {entriesCount === 0 && (
                        <p className="text-sm text-muted-foreground">
                            This slot is not currently used by any classes and can be safely deleted.
                        </p>
                    )}
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isDeleting}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        variant="destructive"
                        onClick={handleDelete}
                        disabled={isDeleting}
                    >
                        {isDeleting ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Deleting...
                            </>
                        ) : (
                            <>
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Slot
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
