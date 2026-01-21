"use client"

import { useState } from "react"
import { User } from "@/lib/types"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MoreHorizontal, Trash, Eye, Search, Filter, KeyRound } from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { deleteUser, resetStudentPassword } from "@/app/actions/admin"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import Link from "next/link"

interface StudentsTableProps {
    initialData: User[]
}

export function StudentsTable({ initialData }: StudentsTableProps) {
    const { toast } = useToast()
    const router = useRouter()

    // Search and Filter States
    const [searchQuery, setSearchQuery] = useState("")
    const [filterDepartment, setFilterDepartment] = useState("all")
    const [filterYear, setFilterYear] = useState("all")
    const [filterGender, setFilterGender] = useState("all")

    // Password Reset State
    const [resetDialogOpen, setResetDialogOpen] = useState(false)
    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)
    const [newPassword, setNewPassword] = useState("")
    const [isResetting, setIsResetting] = useState(false)

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to expel this student? This action cannot be undone.")) return
        try {
            await deleteUser(id)
            toast({ title: "Student Removed", description: "The record has been deleted." })
            router.refresh()
        } catch (error) {
            toast({ title: "Error", description: "Failed to delete student", variant: "destructive" })
        }
    }

    const handleResetPassword = async () => {
        if (!selectedStudentId || !newPassword) return

        try {
            setIsResetting(true)
            await resetStudentPassword(selectedStudentId, newPassword)
            toast({ title: "Success", description: "Password reset successfully" })
            setResetDialogOpen(false)
            setNewPassword("")
            setSelectedStudentId(null)
        } catch (error) {
            toast({ title: "Error", description: "Failed to reset password", variant: "destructive" })
        } finally {
            setIsResetting(false)
        }
    }

    const openResetDialog = (id: string) => {
        setSelectedStudentId(id)
        setResetDialogOpen(true)
    }

    // Get unique departments and years for filters
    const departments = Array.from(new Set(initialData.map(s => (s as any).departmentName || s.department).filter(Boolean)))
    const years = Array.from(new Set(initialData.map(s => s.year).filter(Boolean)))

    // Filter and Search Logic
    const filteredStudents = initialData.filter(student => {
        // Search by name, email, or register number
        const matchesSearch = searchQuery === "" ||
            (student.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
            (student.email || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
            ((student as any).registerNumber || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
            (student.rfidTag || "").toLowerCase().includes(searchQuery.toLowerCase())

        // Filter by department
        const matchesDepartment = filterDepartment === "all" ||
            (student as any).departmentName === filterDepartment ||
            student.department === filterDepartment

        // Filter by year
        const matchesYear = filterYear === "all" || student.year?.toString() === filterYear

        // Filter by gender
        const matchesGender = filterGender === "all" || student.gender?.toLowerCase() === filterGender.toLowerCase()

        return matchesSearch && matchesDepartment && matchesYear && matchesGender
    })

    return (
        <div className="space-y-4">
            {/* Search and Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by name, email, register number, or RFID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>

                <div className="flex gap-2">
                    <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                        <SelectTrigger className="w-[180px]">
                            <Filter className="h-4 w-4 mr-2" />
                            <SelectValue placeholder="Department" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Departments</SelectItem>
                            {departments.map(dept => (
                                <SelectItem key={dept} value={dept as string}>{dept}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={filterYear} onValueChange={setFilterYear}>
                        <SelectTrigger className="w-[120px]">
                            <SelectValue placeholder="Year" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Years</SelectItem>
                            {years.map(year => (
                                <SelectItem key={year} value={year?.toString() || ""}>{year} Year</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={filterGender} onValueChange={setFilterGender}>
                        <SelectTrigger className="w-[120px]">
                            <SelectValue placeholder="Gender" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Genders</SelectItem>
                            <SelectItem value="male">Male</SelectItem>
                            <SelectItem value="female">Female</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Results Count */}
            <div className="text-sm text-muted-foreground">
                Showing {filteredStudents.length} of {initialData.length} students
            </div>

            {/* Table */}
            <div className="rounded-md border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Student</TableHead>
                            <TableHead>Register No</TableHead>
                            <TableHead>Department</TableHead>
                            <TableHead>Year</TableHead>
                            <TableHead>Gender</TableHead>
                            <TableHead>Points</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredStudents.map((student) => (
                            <TableRow key={student.id} className="hover:bg-muted/50">
                                <TableCell className="flex items-center gap-3 font-medium">
                                    <Avatar className="h-9 w-9">
                                        <AvatarImage src={student.avatar} alt={student.name || "Student"} />
                                        <AvatarFallback>{(student.name || "?").charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col">
                                        <span>{student.name || "Unknown Student"}</span>
                                        <span className="text-xs text-muted-foreground">{student.email || "No Email"}</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <code className="text-xs bg-muted px-2 py-1 rounded">
                                        {(student as any).registerNumber || "N/A"}
                                    </code>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline">
                                        {(student as any).departmentName || student.department || "General"}
                                    </Badge>
                                </TableCell>
                                <TableCell>Year {student.year || "?"}</TableCell>
                                <TableCell>
                                    <span className="capitalize">{student.gender || "N/A"}</span>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="secondary">{student.points || 0} XP</Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" className="h-8 w-8 p-0">
                                                <span className="sr-only">Open menu</span>
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                            <DropdownMenuItem asChild>
                                                <Link href={`/dashboard/admin/students/${student.id}`} className="cursor-pointer">
                                                    <Eye className="w-4 h-4 mr-2" />
                                                    View Profile
                                                </Link>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => openResetDialog(student.id)}>
                                                <KeyRound className="w-4 h-4 mr-2" />
                                                Reset Password
                                            </DropdownMenuItem>
                                            <DropdownMenuItem>Edit Details</DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                                className="text-destructive focus:text-destructive"
                                                onClick={() => handleDelete(student.id)}
                                            >
                                                <Trash className="w-4 h-4 mr-2" />
                                                Expel
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))}
                        {filteredStudents.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                                    No students found matching your criteria.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Reset Password Dialog */}
            <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reset Password</DialogTitle>
                        <DialogDescription>
                            Enter a new password for the student.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Label htmlFor="new-password">New Password</Label>
                        <Input
                            id="new-password"
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Enter new password"
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setResetDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleResetPassword} disabled={isResetting || !newPassword}>
                            {isResetting ? "Resetting..." : "Reset Password"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
