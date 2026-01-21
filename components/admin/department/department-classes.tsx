"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
    Class,
    ClassStats,
    Teacher
} from "@/lib/types"

import {
    getClassStats,
    createClass,
    assignClassTutor,
    allocateRoom
} from "@/app/actions/classes"

import { getTeachers } from "@/app/actions/teachers"

import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription
} from "@/components/ui/card"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog"

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select"

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"

import {
    Plus,
    Search,
    User,
    MapPin,
    GraduationCap,
    MoreVertical,
    Building2
} from "lucide-react"

/* -------------------------------------------------- */

interface DepartmentClassesProps {
    departmentId: string
    departmentCode: string
    initialClasses: Class[]
}

export function DepartmentClasses({
    departmentId,
    departmentCode,
    initialClasses
}: DepartmentClassesProps) {
    const router = useRouter()

    const [classes, setClasses] = React.useState(initialClasses)
    const [classStats, setClassStats] = React.useState<Record<string, ClassStats>>({})
    const [teachers, setTeachers] = React.useState<Teacher[]>([])

    const [searchQuery, setSearchQuery] = React.useState("")
    const [loadingStats, setLoadingStats] = React.useState(true)

    const [isCreateOpen, setIsCreateOpen] = React.useState(false)
    const [selectedClass, setSelectedClass] = React.useState<Class | null>(null)
    const [dialogType, setDialogType] = React.useState<"tutor" | "room" | null>(null)

    const [selectedTutor, setSelectedTutor] = React.useState<Teacher | null>(null)

    /* ---------------- Fetch Data ---------------- */

    React.useEffect(() => {
        const fetchAll = async () => {
            setLoadingStats(true)
            try {
                const stats = await Promise.all(
                    classes.map(c => getClassStats(c.id))
                )

                const map: Record<string, ClassStats> = {}
                classes.forEach((c, i) => {
                    if (stats[i]) map[c.id] = stats[i]!
                })

                setClassStats(map)
                setTeachers(await getTeachers())
            } finally {
                setLoadingStats(false)
            }
        }

        if (classes.length) fetchAll()
    }, [classes.length])

    /* ---------------- Filter ---------------- */

    const filteredClasses = classes.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase())
    )

    /* ---------------- Create Class ---------------- */

    const handleCreateClass = async (data: any) => {
        const year = Number(data.year)
        const suffix = ["st", "nd", "rd"][year - 1] || "th"

        const name = `${year}${suffix} Year ${departmentCode}${data.section ? `-${data.section}` : ""}`

        const res = await createClass({
            name,
            year,
            departmentId,
            departmentCode,
            section: data.section,
            capacity: Number(data.capacity)
        })

        if (res.success && res.class) {
            setClasses(prev => [...prev, res.class])
            setIsCreateOpen(false)
            toast.success("Class created")
            router.refresh()
        }
    }

    /* ---------------- UI ---------------- */

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold">Classes</h2>
                    <p className="text-muted-foreground">Manage batches & tutors</p>
                </div>

                <div className="flex gap-2">
                    <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search..."
                            className="pl-8"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <Button onClick={() => setIsCreateOpen(true)}>
                        <Plus className="h-4 w-4 mr-1" /> Add Class
                    </Button>
                </div>
            </div>

            {/* Cards */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredClasses.map(cls => (
                    <ClassCard
                        key={cls.id}
                        cls={cls}
                        stats={classStats[cls.id]}
                        teachers={teachers}
                        loading={loadingStats}
                        onViewTutor={setSelectedTutor}
                        onManageTutor={() => {
                            setSelectedClass(cls)
                            setDialogType("tutor")
                        }}
                        onManageRoom={() => {
                            setSelectedClass(cls)
                            setDialogType("room")
                        }}
                    />
                ))}
            </div>

            {/* Dialogs */}
            <CreateClassDialog
                open={isCreateOpen}
                onOpenChange={setIsCreateOpen}
                onSubmit={handleCreateClass}
            />

            <AssignTutorDialog
                open={dialogType === "tutor"}
                cls={selectedClass}
                teachers={teachers}
                onOpenChange={() => setDialogType(null)}
            />

            <AllocateRoomDialog
                open={dialogType === "room"}
                cls={selectedClass}
                onOpenChange={() => setDialogType(null)}
            />

            <TutorDetailsDialog
                tutor={selectedTutor}
                open={!!selectedTutor}
                onOpenChange={() => setSelectedTutor(null)}
            />
        </div>
    )
}

/* ======================================================
   CLASS CARD
====================================================== */

function ClassCard({
    cls,
    stats,
    teachers,
    loading,
    onManageTutor,
    onManageRoom,
    onViewTutor
}: any) {
    const tutor = teachers.find((t: Teacher) => t.id === cls.classTutorId)

    const students = stats?.totalStudents || 0
    const percent = Math.min((students / cls.capacity) * 100, 100)

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between">
                    <div>
                        <CardTitle>{cls.name}</CardTitle>
                        <CardDescription>
                            <Badge variant="secondary">Year {cls.year}</Badge>
                        </CardDescription>
                    </div>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost">
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Manage</DropdownMenuLabel>
                            <DropdownMenuItem onClick={onManageTutor}>
                                Assign Tutor
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={onManageRoom}>
                                Allocate Room
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </CardHeader>

            <CardContent className="space-y-4">
                <div>
                    <div className="flex justify-between text-xs">
                        <span>Capacity</span>
                        <span>{students}/{cls.capacity}</span>
                    </div>
                    <Progress value={percent} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <User className="h-3 w-3" /> Tutor
                        </p>
                        <p
                            onClick={() => tutor && onViewTutor(tutor)}
                            className={`text-sm font-medium ${tutor
                                ? "cursor-pointer text-primary hover:underline"
                                : "italic text-muted-foreground"
                                }`}
                        >
                            {tutor ? tutor.name : "Unassigned"}
                        </p>
                    </div>

                    <div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> Room
                        </p>
                        <p className="text-sm font-medium">
                            {cls.roomNumber || "Not Set"}
                        </p>
                    </div>
                </div>

                {stats && (
                    <div className="flex justify-between text-xs bg-muted p-2 rounded">
                        <span>{stats.maleStudents} Boys</span>
                        <span>{stats.femaleStudents} Girls</span>
                        <span className="font-medium">{stats.attendanceRate}%</span>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

/* ======================================================
   TUTOR DETAILS DIALOG
====================================================== */

function TutorDetailsDialog({ tutor, open, onOpenChange }: any) {
    if (!tutor) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Tutor Details</DialogTitle>
                    <DialogDescription>Assigned faculty info</DialogDescription>
                </DialogHeader>

                <div className="space-y-3 py-4">
                    <div>
                        <p className="text-xs text-muted-foreground">Name</p>
                        <p className="font-medium">{tutor.name}</p>
                    </div>

                    <div>
                        <p className="text-xs text-muted-foreground">Email</p>
                        <p className="font-medium">{tutor.email}</p>
                    </div>

                    {tutor.phone && (
                        <div>
                            <p className="text-xs text-muted-foreground">Phone</p>
                            <p className="font-medium">{tutor.phone}</p>
                        </div>
                    )}

                    {tutor.department && (
                        <Badge variant="secondary">{tutor.department}</Badge>
                    )}
                </div>

                <DialogFooter>
                    <Button onClick={onOpenChange}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}



// ----------------------------------------------------------------------
// Dialog Components
// ----------------------------------------------------------------------

function CreateClassDialog({ open, onOpenChange, onSubmit }: any) {
    const [formData, setFormData] = React.useState({ year: "1", section: "", capacity: "60" })
    const [loading, setLoading] = React.useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        await onSubmit(formData)
        setLoading(false)
        setFormData({ year: "1", section: "", capacity: "60" })
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Create New Class</DialogTitle>
                    <DialogDescription>Add a new batch to the department.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Year</Label>
                                <Select value={formData.year} onValueChange={(v) => setFormData({ ...formData, year: v })}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {[1, 2, 3, 4].map(y => <SelectItem key={y} value={y.toString()}>{y} Year</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Section</Label>
                                <Input
                                    placeholder="A"
                                    maxLength={1}
                                    value={formData.section}
                                    onChange={(e) => setFormData({ ...formData, section: e.target.value.toUpperCase() })}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Capacity</Label>
                            <Input
                                type="number"
                                min="1"
                                value={formData.capacity}
                                onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                                required
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" disabled={loading}>{loading ? "Creating..." : "Create Class"}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}

function AssignTutorDialog({ open, onOpenChange, cls, teachers, onSuccess }: any) {
    const [tutorId, setTutorId] = React.useState("")
    const [loading, setLoading] = React.useState(false)

    const handleSubmit = async () => {
        if (!cls) return
        setLoading(true)
        try {
            await assignClassTutor(cls.id, tutorId)
            toast.success("Tutor assigned successfully")
            onOpenChange(false)
            onSuccess?.()
        } catch (e) {
            toast.error("Failed to assign tutor")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Assign Class Tutor</DialogTitle>
                    <DialogDescription>Assign a teacher to {cls?.name}</DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <Label className="mb-2 block">Select Teacher</Label>
                    <Select value={tutorId} onValueChange={setTutorId}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a teacher" />
                        </SelectTrigger>
                        <SelectContent>
                            {teachers.map((t: Teacher) => (
                                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={loading || !tutorId}>
                        {loading ? "Saving..." : "Save Changes"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

function AllocateRoomDialog({ open, onOpenChange, cls, onSuccess }: any) {
    const [room, setRoom] = React.useState("")
    const [loading, setLoading] = React.useState(false)

    React.useEffect(() => {
        if (cls?.roomNumber) setRoom(cls.roomNumber)
    }, [cls])

    const handleSubmit = async () => {
        if (!cls) return
        setLoading(true)
        try {
            await allocateRoom(cls.id, room)
            toast.success("Room allocated successfully")
            onOpenChange(false)
            onSuccess?.()
        } catch (e) {
            toast.error("Failed to allocate room")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Allocate Room</DialogTitle>
                    <DialogDescription>Set the classroom location for {cls?.name}</DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <Label className="mb-2 block">Room Number/Name</Label>
                    <Input
                        placeholder="e.g. 304, Lab 1"
                        value={room}
                        onChange={(e) => setRoom(e.target.value)}
                    />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={loading || !room}>
                        {loading ? "Saving..." : "Allocate"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}