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
import { MoreHorizontal, RadioReceiver, Trash, Eye } from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { deleteUser, getTeacherProfile } from "@/app/actions/admin"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { TeacherProfileSheet } from "./teacher-profile-sheet"

interface TeachersTableProps {
    initialData: User[]
}

export function TeachersTable({ initialData }: TeachersTableProps) {
    const { toast } = useToast()
    const router = useRouter()

    // Sheet State
    const [selectedTeacher, setSelectedTeacher] = useState<User | null>(null)
    const [profileData, setProfileData] = useState<{ classes: any[], mentorship: any[] }>({ classes: [], mentorship: [] })
    const [isSheetOpen, setIsSheetOpen] = useState(false)

    const handleDisconnect = () => {
        setIsSheetOpen(false)
        setSelectedTeacher(null)
    }

    const handleViewProfile = async (teacher: User) => {
        setSelectedTeacher(teacher)
        // Open immediately with loading state potentially, but for now we wait or show empty
        setIsSheetOpen(true)

        try {
            // Fetch detailed profile
            const data = await getTeacherProfile(teacher.id)
            if (data) {
                setProfileData({ classes: data.classes, mentorship: data.mentorship })
            }
        } catch (e) {
            toast({ title: "Error", description: "Could not fetch profile details." })
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to remove this teacher?")) return

        try {
            await deleteUser(id)
            toast({ title: "Teacher Removed", description: "The record has been deleted." })
            router.refresh()
        } catch (error) {
            toast({ title: "Error", description: "Failed to delete teacher", variant: "destructive" })
        }
    }

    return (
        <>
            <div className="rounded-md border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Teacher</TableHead>
                            <TableHead>Department</TableHead>
                            <TableHead>RFID Tag</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {initialData.map((teacher) => (
                            <TableRow key={teacher.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleViewProfile(teacher)}>
                                <TableCell className="flex items-center gap-3 font-medium">
                                    <Avatar className="h-9 w-9">
                                        <AvatarImage src={teacher.avatar} alt={teacher.name} />
                                        <AvatarFallback>{teacher.name.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col">
                                        <span>{teacher.name}</span>
                                        <span className="text-xs text-muted-foreground">{teacher.email}</span>
                                    </div>
                                </TableCell>
                                <TableCell>{teacher.department || "General"}</TableCell>
                                <TableCell>
                                    {teacher.rfidTag ? (
                                        <Badge variant="outline" className="font-mono text-xs">
                                            {teacher.rfidTag}
                                        </Badge>
                                    ) : (
                                        <Badge variant="secondary" className="text-xs text-muted-foreground">
                                            <RadioReceiver className="mr-1 h-3 w-3" />
                                            Assign RFID
                                        </Badge>
                                    )}
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">Active</Badge>
                                </TableCell>
                                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" className="h-8 w-8 p-0">
                                                <span className="sr-only">Open menu</span>
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                            <DropdownMenuItem onClick={() => handleViewProfile(teacher)}>
                                                <Eye className="w-4 h-4 mr-2" />
                                                View Profile
                                            </DropdownMenuItem>
                                            <DropdownMenuItem>Assign Class</DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDelete(teacher.id)}>
                                                <Trash className="w-4 h-4 mr-2" />
                                                Remove
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))}
                        {initialData.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                    No teachers found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {selectedTeacher && (
                <TeacherProfileSheet
                    open={isSheetOpen}
                    onOpenChange={setIsSheetOpen}
                    teacher={selectedTeacher}
                    classes={profileData.classes}
                    mentorship={profileData.mentorship}
                />
            )}
        </>
    )
}
