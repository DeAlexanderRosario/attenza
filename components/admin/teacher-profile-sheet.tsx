"use client"

import { useState } from "react"
import { User, Slot } from "@/lib/types"
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { updateTeacher } from "@/app/actions/admin"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { CalendarDays, Mail, MapPin, RadioReceiver, Save, User as UserIcon, GraduationCap } from "lucide-react"

interface TeacherProfileSheetProps {
    teacher: User
    classes: Slot[]
    mentorship: any[]
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function TeacherProfileSheet({ teacher, classes, mentorship, open, onOpenChange }: TeacherProfileSheetProps) {
    const [isLoading, setIsLoading] = useState(false)
    const { toast } = useToast()
    const router = useRouter()

    const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setIsLoading(true)
        const formData = new FormData(e.currentTarget)

        try {
            await updateTeacher(teacher.id, {
                name: formData.get("name") as string,
                email: formData.get("email") as string,
                department: formData.get("department") as string,
                rfidTag: formData.get("rfidTag") as string,
            })
            toast({ title: "Updated", description: "Teacher profile updated." })
            router.refresh()
            onOpenChange(false)
        } catch (err) {
            toast({ title: "Error", description: "Failed to update profile.", variant: "destructive" })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
                <SheetHeader className="pb-6 border-b">
                    <div className="flex flex-col items-center gap-4">
                        <Avatar className="w-24 h-24 border-4 border-muted">
                            <AvatarImage src={teacher.avatar} />
                            <AvatarFallback className="text-2xl">{teacher.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="text-center space-y-1">
                            <SheetTitle className="text-2xl">{teacher.name}</SheetTitle>
                            <SheetDescription className="text-base font-medium text-primary">
                                {teacher.department || "General Department"}
                            </SheetDescription>
                            <div className="flex items-center justify-center gap-2 pt-2">
                                <Badge variant="outline" className="text-xs">
                                    <Mail className="w-3 h-3 mr-1" />
                                    {teacher.email}
                                </Badge>
                                <Badge variant="secondary" className="text-xs">
                                    <RadioReceiver className="w-3 h-3 mr-1" />
                                    {teacher.rfidTag || "No Tag"}
                                </Badge>
                            </div>
                        </div>
                    </div>
                </SheetHeader>

                <Tabs defaultValue="overview" className="mt-6">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="classes">Classes</TabsTrigger>
                        <TabsTrigger value="edit">Edit Profile</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="space-y-4 mt-6">
                        <div className="grid grid-cols-2 gap-4">
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Classes</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{classes.length}</div>
                                    <p className="text-xs text-muted-foreground">Assigned slots</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">Mentorships</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{mentorship.length}</div>
                                    <p className="text-xs text-muted-foreground">Batches assigned</p>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="rounded-md border p-4 bg-muted/20">
                            <h3 className="font-semibold mb-3 flex items-center gap-2">
                                <GraduationCap className="w-4 h-4" />
                                Class Teacher For (Tutor)
                            </h3>
                            {mentorship.length > 0 ? (
                                <ul className="space-y-2">
                                    {mentorship.map((m, i) => (
                                        <li key={i} className="text-sm bg-background p-2 rounded-md border shadow-sm">
                                            {m.department} - Year {m.year} (Batch {m.id})
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-sm text-muted-foreground italic">Not assigned as a Class Teacher.</p>
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent value="classes" className="mt-6">
                        <ScrollArea className="h-[400px] rounded-md border p-4">
                            <h3 className="font-semibold mb-4 text-sm text-muted-foreground uppercase tracking-wider">Weekly Schedule</h3>
                            <div className="space-y-4">
                                {classes.map((cls, i) => (
                                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                                        <div className="bg-primary/10 p-2 rounded-md text-primary">
                                            <CalendarDays className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <div className="font-semibold">{cls.courseName}</div>
                                            <div className="text-sm text-muted-foreground flex items-center gap-2">
                                                <span>{cls.courseCode}</span>
                                                <span>•</span>
                                                <span className="font-medium text-foreground">{cls.day} {cls.startTime} - {cls.endTime}</span>
                                            </div>
                                            <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                                                <MapPin className="w-3 h-3" />
                                                {cls.room} • {cls.department} Sem {cls.semester}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {classes.length === 0 && <p className="text-muted-foreground text-center py-8">No classes assigned.</p>}
                            </div>
                        </ScrollArea>
                    </TabsContent>

                    <TabsContent value="edit" className="mt-6">
                        <form onSubmit={handleUpdate} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Full Name</Label>
                                <div className="relative">
                                    <UserIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input id="name" name="name" defaultValue={teacher.name} className="pl-9" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Email Address</Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input id="email" name="email" defaultValue={teacher.email} className="pl-9" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="department">Department</Label>
                                <Input id="department" name="department" defaultValue={teacher.department} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="rfidTag">RFID Tag ID</Label>
                                <div className="relative">
                                    <RadioReceiver className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input id="rfidTag" name="rfidTag" defaultValue={teacher.rfidTag} className="pl-9" />
                                </div>
                            </div>
                            <Button type="submit" className="w-full">
                                <Save className="w-4 h-4 mr-2" />
                                Save Changes
                            </Button>
                        </form>
                    </TabsContent>
                </Tabs>
            </SheetContent>
        </Sheet>
    )
}
