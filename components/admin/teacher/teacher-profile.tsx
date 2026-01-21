"use client"

import { User } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
    User as UserIcon, Mail, Phone, MapPin, CreditCard,
    GraduationCap, Calendar, Droplet, AlertCircle, Book, Clock
} from "lucide-react"

interface TeacherProfileProps {
    teacher: User
    subjects: any[]
    timetable: any[]
}

export function TeacherProfile({ teacher, subjects, timetable }: TeacherProfileProps) {
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
    const timetableByDay = days.map(day => ({
        day,
        slots: timetable.filter(s => s.day === day)
    }))

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start gap-6">
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary text-primary-foreground text-4xl font-bold">
                    {teacher.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                    <h1 className="text-3xl font-bold tracking-tight">{teacher.name}</h1>
                    <p className="text-lg text-muted-foreground">{teacher.qualification || "Faculty Member"}</p>
                    <div className="flex gap-2 mt-2">
                        <Badge variant="outline">{teacher.department}</Badge>
                        {teacher.employeeId && <Badge>ID: {teacher.employeeId}</Badge>}
                    </div>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Subjects Teaching</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{subjects.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Weekly Classes</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{timetable.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Department</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-semibold">{teacher.department}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Experience</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-semibold">
                            {teacher.dateOfJoining ?
                                `${Math.floor((new Date().getTime() - new Date(teacher.dateOfJoining).getTime()) / (365 * 24 * 60 * 60 * 1000))} years`
                                : "N/A"}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="personal" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="personal">Personal Info</TabsTrigger>
                    <TabsTrigger value="subjects">Subjects</TabsTrigger>
                    <TabsTrigger value="timetable">Timetable</TabsTrigger>
                </TabsList>

                <TabsContent value="personal" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Contact Information</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-4 md:grid-cols-2">
                            {teacher.email && (
                                <div className="flex items-center gap-3">
                                    <Mail className="h-5 w-5 text-muted-foreground" />
                                    <div>
                                        <p className="text-sm text-muted-foreground">Email</p>
                                        <p className="font-medium">{teacher.email}</p>
                                    </div>
                                </div>
                            )}
                            {teacher.phoneNumber && (
                                <div className="flex items-center gap-3">
                                    <Phone className="h-5 w-5 text-muted-foreground" />
                                    <div>
                                        <p className="text-sm text-muted-foreground">Phone</p>
                                        <p className="font-medium">{teacher.phoneNumber}</p>
                                    </div>
                                </div>
                            )}
                            {teacher.address && (
                                <div className="flex items-center gap-3 md:col-span-2">
                                    <MapPin className="h-5 w-5 text-muted-foreground" />
                                    <div>
                                        <p className="text-sm text-muted-foreground">Address</p>
                                        <p className="font-medium">{teacher.address}</p>
                                    </div>
                                </div>
                            )}
                            {teacher.emergencyContact && (
                                <div className="flex items-center gap-3">
                                    <AlertCircle className="h-5 w-5 text-muted-foreground" />
                                    <div>
                                        <p className="text-sm text-muted-foreground">Emergency Contact</p>
                                        <p className="font-medium">{teacher.emergencyContact}</p>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Official Details</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-4 md:grid-cols-2">
                            {teacher.rfidTag && (
                                <div className="flex items-center gap-3">
                                    <CreditCard className="h-5 w-5 text-muted-foreground" />
                                    <div>
                                        <p className="text-sm text-muted-foreground">RFID Tag</p>
                                        <p className="font-medium">{teacher.rfidTag}</p>
                                    </div>
                                </div>
                            )}
                            {teacher.aadharNumber && (
                                <div className="flex items-center gap-3">
                                    <CreditCard className="h-5 w-5 text-muted-foreground" />
                                    <div>
                                        <p className="text-sm text-muted-foreground">Aadhar Number</p>
                                        <p className="font-medium">{teacher.aadharNumber}</p>
                                    </div>
                                </div>
                            )}
                            {teacher.gender && (
                                <div className="flex items-center gap-3">
                                    <UserIcon className="h-5 w-5 text-muted-foreground" />
                                    <div>
                                        <p className="text-sm text-muted-foreground">Gender</p>
                                        <p className="font-medium capitalize">{teacher.gender}</p>
                                    </div>
                                </div>
                            )}
                            {teacher.bloodGroup && (
                                <div className="flex items-center gap-3">
                                    <Droplet className="h-5 w-5 text-muted-foreground" />
                                    <div>
                                        <p className="text-sm text-muted-foreground">Blood Group</p>
                                        <p className="font-medium">{teacher.bloodGroup}</p>
                                    </div>
                                </div>
                            )}
                            {teacher.dateOfBirth && (
                                <div className="flex items-center gap-3">
                                    <Calendar className="h-5 w-5 text-muted-foreground" />
                                    <div>
                                        <p className="text-sm text-muted-foreground">Date of Birth</p>
                                        <p className="font-medium">{new Date(teacher.dateOfBirth).toLocaleDateString()}</p>
                                    </div>
                                </div>
                            )}
                            {teacher.dateOfJoining && (
                                <div className="flex items-center gap-3">
                                    <Calendar className="h-5 w-5 text-muted-foreground" />
                                    <div>
                                        <p className="text-sm text-muted-foreground">Date of Joining</p>
                                        <p className="font-medium">{new Date(teacher.dateOfJoining).toLocaleDateString()}</p>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="subjects" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Subjects Teaching</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {subjects.length === 0 ? (
                                <p className="text-center py-8 text-muted-foreground">No subjects assigned</p>
                            ) : (
                                <div className="grid gap-3">
                                    {subjects.map((sub, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                                            <div className="flex items-center gap-3">
                                                <Book className="h-5 w-5 text-muted-foreground" />
                                                <div>
                                                    <p className="font-medium">{sub.subjectName}</p>
                                                    <p className="text-sm text-muted-foreground">{sub.subjectCode}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <Badge variant="outline">{sub.departmentCode}</Badge>
                                                <p className="text-xs text-muted-foreground mt-1">Semester {sub.semester}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="timetable" className="space-y-4">
                    {timetableByDay.map(({ day, slots }) => (
                        slots.length > 0 && (
                            <Card key={day}>
                                <CardHeader>
                                    <CardTitle className="text-lg">{day}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        {slots.map((slot, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                                                <div className="flex items-center gap-3">
                                                    <Clock className="h-4 w-4 text-muted-foreground" />
                                                    <div>
                                                        <p className="font-medium">{slot.courseName}</p>
                                                        <p className="text-sm text-muted-foreground">{slot.startTime} - {slot.endTime}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <Badge variant="outline">{slot.room}</Badge>
                                                    <p className="text-xs text-muted-foreground mt-1">Year {slot.year}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    ))}
                    {timetable.length === 0 && (
                        <Card>
                            <CardContent className="pt-6">
                                <p className="text-center py-8 text-muted-foreground">No classes scheduled</p>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    )
}
