"use client"

import * as React from "react"
import { User } from "@/lib/types"
import { getTeachers, createTeacher, updateTeacher, deleteTeacher } from "@/app/actions/teachers"

// UI Components
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
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
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"

// Icons
import {
    Plus, Pencil, Phone, GraduationCap, Trash2,
    IdCard, Loader2, Search, Mail, User as UserIcon, Sparkles
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

/* =========================================================
   TYPES
========================================================= */

interface Props {
    departmentCode: string
}

// Extended interface to ensure safety
interface ExtendedUser extends User {
    phoneNumber?: string
    employeeId?: string
    qualification?: string
}

interface TeacherForm {
    id: string
    name: string
    email: string
    phoneNumber: string
    employeeId: string
    qualification: string
    rfidTag: string
}

const EMPTY_FORM: TeacherForm = {
    id: "",
    name: "",
    email: "",
    phoneNumber: "",
    employeeId: "",
    qualification: "",
    rfidTag: "",
}

/* =========================================================
   COMPONENT
========================================================= */

export function StaffAllocation({ departmentCode }: Props) {
    const [teachers, setTeachers] = React.useState<ExtendedUser[]>([])
    const [loading, setLoading] = React.useState(true)
    const [submitting, setSubmitting] = React.useState(false)
    const [searchQuery, setSearchQuery] = React.useState("")

    // Dialog States
    const [dialogOpen, setDialogOpen] = React.useState(false)
    const [deleteAlertOpen, setDeleteAlertOpen] = React.useState(false)
    const [teacherToDelete, setTeacherToDelete] = React.useState<string | null>(null)

    const [mode, setMode] = React.useState<"create" | "edit">("create")
    const [form, setForm] = React.useState<TeacherForm>(EMPTY_FORM)

    /* ---------------- Load Data ---------------- */

    const loadTeachers = React.useCallback(async () => {
        setLoading(true)
        try {
            const data = await getTeachers(departmentCode)
            setTeachers(data as ExtendedUser[])
        } catch (error) {
            toast.error("Failed to load staff records")
        } finally {
            setLoading(false)
        }
    }, [departmentCode])

    React.useEffect(() => {
        loadTeachers()
    }, [loadTeachers])

    /* ---------------- Computed ---------------- */

    const filteredTeachers = React.useMemo(() => {
        if (!searchQuery) return teachers
        const lowerQ = searchQuery.toLowerCase()
        return teachers.filter(t =>
            t.name?.toLowerCase().includes(lowerQ) ||
            t.email?.toLowerCase().includes(lowerQ) ||
            t.employeeId?.toLowerCase().includes(lowerQ)
        )
    }, [teachers, searchQuery])

    /* ---------------- Handlers ---------------- */

    const openCreate = () => {
        setMode("create")
        setForm(EMPTY_FORM)
        setDialogOpen(true)
    }

    const openEdit = (teacher: ExtendedUser) => {
        setMode("edit")
        setForm({
            id: teacher.id,
            name: teacher.name || "",
            email: teacher.email || "",
            phoneNumber: teacher.phoneNumber || "",
            employeeId: teacher.employeeId || "",
            qualification: teacher.qualification || "",
            rfidTag: teacher.rfidTag || "",
        })
        setDialogOpen(true)
    }

    const confirmDelete = (id: string) => {
        setTeacherToDelete(id)
        setDeleteAlertOpen(true)
    }

    const handleSubmit = async () => {
        if (!form.name || !form.email) {
            toast.warning("Name and Email are required")
            return
        }

        setSubmitting(true)
        try {
            const payload = {
                name: form.name,
                email: form.email,
                phoneNumber: form.phoneNumber,
                employeeId: form.employeeId,
                qualification: form.qualification,
                rfidTag: form.rfidTag
            }

            if (mode === "create") {
                await createTeacher({ ...payload, department: departmentCode })
                toast.success("Staff member added successfully")
            } else {
                await updateTeacher(form.id, payload)
                toast.success("Profile updated successfully")
            }

            setDialogOpen(false)
            loadTeachers()
        } catch (error: any) {
            toast.error(error.message || "Operation failed")
        } finally {
            setSubmitting(false)
        }
    }

    const handleDeleteExecute = async () => {
        if (!teacherToDelete) return
        try {
            await deleteTeacher(teacherToDelete)
            toast.success("Staff member removed")
            loadTeachers()
        } catch (error: any) {
            toast.error(error.message || "Could not delete teacher")
        } finally {
            setDeleteAlertOpen(false)
            setTeacherToDelete(null)
        }
    }

    /* ---------------- Sub-Components ---------------- */

    const StaffCard = ({ t }: { t: ExtendedUser }) => (
        <div className="group relative overflow-hidden rounded-xl border border-white/20 bg-white/10 p-5 shadow-lg backdrop-blur-md transition-all duration-300 hover:bg-white/20 hover:shadow-xl dark:bg-black/20 dark:border-white/10 dark:hover:bg-black/30">
            {/* Subtle Gradient Glow on Hover */}
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/20 blur-3xl transition-all group-hover:bg-primary/30" />

            <div className="relative z-10 flex flex-col sm:flex-row gap-5 items-start sm:items-center">

                {/* Avatar Section */}
                <div className="relative">
                    <Avatar className="h-16 w-16 border-2 border-white/30 shadow-sm transition-transform duration-300 group-hover:scale-105">
                        <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${t.name}`} />
                        <AvatarFallback className="bg-gradient-to-br from-primary/80 to-primary/40 text-white text-lg font-bold">
                            {t.name?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                    {t.qualification && (
                        <Badge variant="secondary" className="absolute -bottom-2 -right-2 px-1.5 py-0.5 text-[10px] bg-background/80 backdrop-blur-sm border-white/10 shadow-sm">
                            {t.qualification}
                        </Badge>
                    )}
                </div>

                {/* Info Section */}
                <div className="flex-1 space-y-1.5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <h4 className="font-bold text-lg leading-none tracking-tight text-foreground/90">
                                {t.name}
                            </h4>
                            {t.employeeId && (
                                <Badge variant="outline" className="text-[10px] font-mono opacity-70">
                                    {t.employeeId}
                                </Badge>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="h-3.5 w-3.5" />
                        <span className="truncate max-w-[150px] sm:max-w-xs">{t.email}</span>
                    </div>

                    <div className="flex items-center gap-4 pt-1">
                        {t.phoneNumber ? (
                            <div className="flex items-center gap-1.5 text-xs font-medium text-foreground/70">
                                <Phone className="h-3 w-3" />
                                {t.phoneNumber}
                            </div>
                        ) : (
                            <div className="text-xs text-muted-foreground/50 italic">No phone</div>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex sm:flex-col gap-2 w-full sm:w-auto mt-2 sm:mt-0 opacity-100 sm:opacity-0 sm:-translate-x-2 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0">
                    <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 rounded-full bg-white/10 hover:bg-primary/20 hover:text-primary"
                        onClick={() => openEdit(t)}
                    >
                        <Pencil className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                    </Button>
                    <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 rounded-full bg-white/10 hover:bg-destructive/20 hover:text-destructive"
                        onClick={() => confirmDelete(t.id)}
                    >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete</span>
                    </Button>
                </div>
            </div>
        </div>
    )

    const LoadingSkeleton = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-4 p-5 rounded-xl border border-white/10 bg-white/5">
                    <Skeleton className="h-16 w-16 rounded-full bg-white/10" />
                    <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-1/2 bg-white/10" />
                        <Skeleton className="h-3 w-3/4 bg-white/10" />
                    </div>
                </div>
            ))}
        </div>
    )

    /* ========================================================= */

    return (
        <div className="w-full space-y-6">

            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 p-1">
                <div className="space-y-1">
                    <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
                        Staff Management
                    </h2>
                    <p className="text-muted-foreground flex items-center gap-2">
                        Managing faculty for <Badge variant="secondary" className="font-mono">{departmentCode}</Badge>
                    </p>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search staff..."
                            className="pl-9 bg-white/5 border-white/10 focus-visible:ring-primary/50"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <Button onClick={openCreate} className="shadow-lg shadow-primary/20 transition-all hover:scale-105">
                        <Plus className="mr-2 h-4 w-4" /> Add
                    </Button>
                </div>
            </div>

            {/* Content Area */}
            <div className="min-h-[400px]">
                {loading ? (
                    <LoadingSkeleton />
                ) : filteredTeachers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 rounded-xl border border-dashed border-white/20 bg-white/5 text-center animate-in fade-in zoom-in-95">
                        <div className="h-16 w-16 bg-muted/20 rounded-full flex items-center justify-center mb-4">
                            <UserIcon className="h-8 w-8 text-muted-foreground/50" />
                        </div>
                        <h3 className="text-lg font-semibold">No Staff Found</h3>
                        <p className="text-sm text-muted-foreground max-w-sm mt-1 mb-6">
                            {searchQuery
                                ? "No results match your search criteria."
                                : `There are no faculty members assigned to ${departmentCode} yet.`}
                        </p>
                        {searchQuery ? (
                            <Button variant="link" onClick={() => setSearchQuery("")}>Clear Search</Button>
                        ) : (
                            <Button onClick={openCreate} variant="outline" className="gap-2 bg-transparent border-primary/30 text-primary hover:bg-primary/10">
                                <Sparkles className="h-4 w-4" /> Add First Teacher
                            </Button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {filteredTeachers.map((t) => (
                            <StaffCard key={t.id} t={t} />
                        ))}
                    </div>
                )}
            </div>

            {/* ================= EDIT / CREATE DIALOG ================= */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-xl bg-background/95 backdrop-blur-xl border-white/10 sm:rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl">
                            {mode === "create" ? <div className="p-2 bg-primary/10 rounded-full"><Plus className="h-5 w-5 text-primary" /></div> : <div className="p-2 bg-primary/10 rounded-full"><Pencil className="h-5 w-5 text-primary" /></div>}
                            {mode === "create" ? "Add New Staff" : "Edit Profile"}
                        </DialogTitle>
                        <DialogDescription>
                            {mode === "create"
                                ? "Fill in the details below to onboard a new faculty member."
                                : "Update personal details and qualifications."}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid grid-cols-2 gap-5 py-4">
                        <div className="col-span-2 space-y-2">
                            <Label className="text-xs font-semibold uppercase text-muted-foreground">Full Name <span className="text-red-500">*</span></Label>
                            <div className="relative">
                                <UserIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/50" />
                                <Input
                                    className="pl-9 bg-muted/30"
                                    placeholder="e.g. Dr. John Doe"
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="col-span-2 sm:col-span-1 space-y-2">
                            <Label className="text-xs font-semibold uppercase text-muted-foreground">Email <span className="text-red-500">*</span></Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/50" />
                                <Input
                                    type="email"
                                    className="pl-9 bg-muted/30"
                                    placeholder="john@college.edu"
                                    disabled={mode === "edit"}
                                    value={form.email}
                                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="col-span-2 sm:col-span-1 space-y-2">
                            <Label className="text-xs font-semibold uppercase text-muted-foreground">Employee ID</Label>
                            <div className="relative">
                                <IdCard className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/50" />
                                <Input
                                    className="pl-9 bg-muted/30"
                                    placeholder="e.g. EMP-001"
                                    value={form.employeeId}
                                    onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="col-span-2 sm:col-span-1 space-y-2">
                            <Label className="text-xs font-semibold uppercase text-muted-foreground">Phone</Label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/50" />
                                <Input
                                    className="pl-9 bg-muted/30"
                                    placeholder="+91 98765 43210"
                                    value={form.phoneNumber}
                                    onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="col-span-2 sm:col-span-1 space-y-2">
                            <Label className="text-xs font-semibold uppercase text-muted-foreground">Qualification</Label>
                            <div className="relative">
                                <GraduationCap className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/50" />
                                <Input
                                    className="pl-9 bg-muted/30"
                                    placeholder="e.g. PhD, M.Tech"
                                    value={form.qualification}
                                    onChange={(e) => setForm({ ...form, qualification: e.target.value })}
                                />
                            </div>
                        </div>


                        <div className="col-span-2 sm:col-span-1 space-y-2">
                            <Label className="text-xs font-semibold uppercase text-muted-foreground">RFID Tag</Label>
                            <div className="relative">
                                <IdCard className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/50" />
                                <Input
                                    className="pl-9 bg-muted/30"
                                    placeholder="Scan RFID..."
                                    value={form.rfidTag}
                                    onChange={(e) => setForm({ ...form, rfidTag: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="ghost" onClick={() => setDialogOpen(false)} disabled={submitting}>
                            Cancel
                        </Button>
                        <Button onClick={handleSubmit} disabled={submitting} className="min-w-[120px]">
                            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            {mode === "create" ? "Create Account" : "Save Changes"}
                        </Button>
                    </DialogFooter>
                </DialogContent >
            </Dialog >

            {/* ================= DELETE CONFIRMATION ================= */}
            < AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen} >
                <AlertDialogContent className="bg-background/95 backdrop-blur-xl border-white/10">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the staff profile and remove them from any assigned timetables.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteExecute}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Yes, Delete Staff
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog >
        </div >
    )
}