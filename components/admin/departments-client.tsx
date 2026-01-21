"use client"

import * as React from "react"
import { Department } from "@/lib/types"
import { createDepartment, deleteDepartment } from "@/app/actions/department"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
import { Plus, Trash2 } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

interface DepartmentsClientProps {
    initialDepartments: Department[]
}

export function DepartmentsClient({ initialDepartments }: DepartmentsClientProps) {
    const [departments, setDepartments] = React.useState(initialDepartments)
    const [dialogOpen, setDialogOpen] = React.useState(false)
    const [loading, setLoading] = React.useState(false)
    const [formData, setFormData] = React.useState({
        name: "",
        code: "",
        description: ""
    })

    // Delete State
    const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
    const [deptToDelete, setDeptToDelete] = React.useState<string | null>(null)

    const router = useRouter()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            // Remove hardcoded organizationId to use the session one
            const result = await createDepartment(formData)

            if (result.success && result.department) {
                setDepartments([...departments, result.department])
                setDialogOpen(false)
                setFormData({ name: "", code: "", description: "" })
                router.refresh()
            } else {
                // Handle known failure (e.g. duplicate code)
                alert(result.message || "Failed to create department")
            }
        } catch (error) {
            console.error("Failed to create department:", error)
            alert("Failed to create department. Please try again.")
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async () => {
        if (!deptToDelete) return
        setLoading(true)
        try {
            const result = await deleteDepartment(deptToDelete)
            if (result.success) {
                setDepartments(departments.filter(d => d.id !== deptToDelete))
                setDeleteDialogOpen(false)
                setDeptToDelete(null)
                router.refresh()
            } else {
                alert(result.error || "Failed to delete department")
            }
        } catch (error) {
            console.error("Delete failed:", error)
            alert("An error occurred while deleting.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">Departments</h2>
                <div className="flex items-center space-x-2">
                    <Button onClick={() => setDialogOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" /> Add Department
                    </Button>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {departments.map((dept) => (
                    <div key={dept.id} className="relative group">
                        <Link href={`/dashboard/admin/departments/${dept.id}`} className="block">
                            <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full bg-card">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Department</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{dept.name}</div>
                                    <p className="text-xs text-muted-foreground">
                                        {dept.code}
                                    </p>
                                    {dept.description && (
                                        <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                                            {dept.description}
                                        </p>
                                    )}
                                </CardContent>
                            </Card>
                        </Link>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-destructive/10 hover:text-destructive"
                            onClick={(e) => {
                                e.stopPropagation()
                                e.preventDefault()
                                setDeptToDelete(dept.id)
                                setDeleteDialogOpen(true)
                            }}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                ))}
            </div>

            {/* Add Department Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add New Department</DialogTitle>
                        <DialogDescription>
                            Create a new department in the system.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit}>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="name">Department Name</Label>
                                <Input
                                    id="name"
                                    placeholder="e.g., Computer Science"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="code">Department Code</Label>
                                <Input
                                    id="code"
                                    placeholder="e.g., CS"
                                    value={formData.code}
                                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="description">Description (Optional)</Label>
                                <Textarea
                                    id="description"
                                    placeholder="Brief description of the department"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    rows={3}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setDialogOpen(false)}
                                disabled={loading}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={loading}>
                                {loading ? "Creating..." : "Create Department"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the department AND ALL associated students, teachers, classes, and timetable slots.
                            Please confirm you want to perform this cascading delete.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                            {loading ? "Deleting..." : "Delete"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
