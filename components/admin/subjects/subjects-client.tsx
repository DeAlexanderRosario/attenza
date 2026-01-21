"use client"

import * as React from "react"
import { Subject } from "@/lib/types"
import { Department } from "@/lib/types"
import {
    createSubject,
    updateSubject,
    deleteSubject,
    assignSubjectToDepartment,
    getSubjectsByDepartment
} from "@/app/actions/subjects"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Plus, Edit, Trash2, MapPin, Search } from "lucide-react"
import { useRouter } from "next/navigation"

interface SubjectsClientProps {
    initialSubjects: Subject[]
    departments: Department[]
}

export function SubjectsClient({ initialSubjects, departments }: SubjectsClientProps) {
    const [subjects, setSubjects] = React.useState(initialSubjects)
    const [searchQuery, setSearchQuery] = React.useState("")
    const [filterType, setFilterType] = React.useState<"all" | "common" | "unique">("all")
    const [addDialogOpen, setAddDialogOpen] = React.useState(false)
    const [editDialogOpen, setEditDialogOpen] = React.useState(false)
    const [mapDialogOpen, setMapDialogOpen] = React.useState(false)
    const [selectedSubject, setSelectedSubject] = React.useState<Subject | null>(null)
    const router = useRouter()

    // Form States
    const [formData, setFormData] = React.useState({
        name: "",
        code: "",
        description: "",
        credits: 3,
        type: "common" as "common" | "unique"
    })

    const [mapData, setMapData] = React.useState({
        departmentCode: "",
        semester: 1,
        isElective: false
    })

    const filteredSubjects = subjects.filter(s => {
        const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.code.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesType = filterType === "all" || s.type === filterType
        return matchesSearch && matchesType
    })

    const handleAdd = async () => {
        const result = await createSubject(formData)
        if (result.success && result.subject) {
            setSubjects([...subjects, result.subject])
            setAddDialogOpen(false)
            resetForm()
        }
    }

    const handleEdit = async () => {
        if (!selectedSubject) return
        await updateSubject(selectedSubject.id, formData)
        setSubjects(subjects.map(s => s.id === selectedSubject.id ? { ...s, ...formData } : s))
        setEditDialogOpen(false)
        resetForm()
    }

    const handleDelete = async (id: string) => {
        if (confirm("Delete this subject? This will remove all department and teacher mappings.")) {
            await deleteSubject(id)
            setSubjects(subjects.filter(s => s.id !== id))
        }
    }

    const handleMapToDepartment = async () => {
        if (!selectedSubject) return
        const result = await assignSubjectToDepartment({
            subjectId: selectedSubject.id,
            ...mapData
        })
        if (result.success) {
            setMapDialogOpen(false)
            resetMapForm()
            alert("Subject mapped to department successfully!")
        } else {
            alert(result.error || "Failed to map subject")
        }
    }

    const resetForm = () => {
        setFormData({
            name: "",
            code: "",
            description: "",
            credits: 3,
            type: "common"
        })
        setSelectedSubject(null)
    }

    const resetMapForm = () => {
        setMapData({
            departmentCode: "",
            semester: 1,
            isElective: false
        })
    }

    const openEditDialog = (subject: Subject) => {
        setSelectedSubject(subject)
        setFormData({
            name: subject.name,
            code: subject.code,
            description: subject.description || "",
            credits: subject.credits,
            type: subject.type
        })
        setEditDialogOpen(true)
    }

    const openMapDialog = (subject: Subject) => {
        setSelectedSubject(subject)
        resetMapForm()
        setMapDialogOpen(true)
    }

    return (
        <div className="space-y-4">
            {/* Filters & Add Button */}
            <Card>
                <CardHeader>
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div className="flex-1 w-full md:w-auto">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search by name or code..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9"
                                />
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Select value={filterType} onValueChange={(v: any) => setFilterType(v)}>
                                <SelectTrigger className="w-[140px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Types</SelectItem>
                                    <SelectItem value="common">Common</SelectItem>
                                    <SelectItem value="unique">Unique</SelectItem>
                                </SelectContent>
                            </Select>
                            <Button onClick={() => setAddDialogOpen(true)}>
                                <Plus className="h-4 w-4 mr-2" />
                                Add Subject
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Code</TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Credits</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredSubjects.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                                            No subjects found
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredSubjects.map((subject) => (
                                        <TableRow key={subject.id}>
                                            <TableCell className="font-mono font-semibold">{subject.code}</TableCell>
                                            <TableCell className="font-medium">{subject.name}</TableCell>
                                            <TableCell>{subject.credits}</TableCell>
                                            <TableCell>
                                                <Badge variant={subject.type === "common" ? "default" : "secondary"}>
                                                    {subject.type}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="max-w-xs truncate">{subject.description || "—"}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => openMapDialog(subject)}
                                                    >
                                                        <MapPin className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => openEditDialog(subject)}
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => handleDelete(subject.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Add Subject Dialog */}
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add New Subject</DialogTitle>
                        <DialogDescription>Create a new subject/course in the system.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="code">Subject Code</Label>
                            <Input
                                id="code"
                                placeholder="e.g., CS101"
                                value={formData.code}
                                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="name">Subject Name</Label>
                            <Input
                                id="name"
                                placeholder="e.g., Data Structures"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="credits">Credits</Label>
                            <Input
                                id="credits"
                                type="number"
                                min="1"
                                max="6"
                                value={formData.credits}
                                onChange={(e) => setFormData({ ...formData, credits: parseInt(e.target.value) })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="type">Type</Label>
                            <Select value={formData.type} onValueChange={(v: any) => setFormData({ ...formData, type: v })}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="common">Common (Shared across departments)</SelectItem>
                                    <SelectItem value="unique">Unique (Department-specific)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="description">Description</Label>
                            <Input
                                id="description"
                                placeholder="Optional description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setAddDialogOpen(false); resetForm(); }}>
                            Cancel
                        </Button>
                        <Button onClick={handleAdd}>Create Subject</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Subject Dialog */}
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Subject</DialogTitle>
                        <DialogDescription>Update subject details.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="edit-name">Subject Name</Label>
                            <Input
                                id="edit-name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="edit-credits">Credits</Label>
                            <Input
                                id="edit-credits"
                                type="number"
                                value={formData.credits}
                                onChange={(e) => setFormData({ ...formData, credits: parseInt(e.target.value) })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="edit-description">Description</Label>
                            <Input
                                id="edit-description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setEditDialogOpen(false); resetForm(); }}>
                            Cancel
                        </Button>
                        <Button onClick={handleEdit}>Save Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Map to Department Dialog */}
            <Dialog open={mapDialogOpen} onOpenChange={setMapDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Map Subject to Department</DialogTitle>
                        <DialogDescription>
                            Assign "{selectedSubject?.name}" to a department and semester.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="department">Department</Label>
                            <Select value={mapData.departmentCode} onValueChange={(v) => setMapData({ ...mapData, departmentCode: v })}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select department" />
                                </SelectTrigger>
                                <SelectContent>
                                    {departments.map(dept => (
                                        <SelectItem key={dept.code} value={dept.code}>
                                            {dept.name} ({dept.code})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="semester">Semester</Label>
                            <Select value={mapData.semester.toString()} onValueChange={(v) => setMapData({ ...mapData, semester: parseInt(v) })}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                                        <SelectItem key={sem} value={sem.toString()}>Semester {sem}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                id="elective"
                                checked={mapData.isElective}
                                onChange={(e) => setMapData({ ...mapData, isElective: e.target.checked })}
                                className="h-4 w-4"
                            />
                            <Label htmlFor="elective" className="cursor-pointer">
                                Elective Subject
                            </Label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setMapDialogOpen(false); resetMapForm(); }}>
                            Cancel
                        </Button>
                        <Button onClick={handleMapToDepartment}>Map to Department</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
