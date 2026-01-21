"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
    User, Mail, Phone, MapPin, Users, GraduationCap,
    Calendar, Award, TrendingUp, Clock, CheckCircle2,
    XCircle, AlertCircle, ArrowLeft
} from "lucide-react"
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Legend } from "recharts"
import { Progress } from "@/components/ui/progress"
import Link from "next/link"
import { EditStudentDialog } from "@/components/admin/edit-student-dialog"

interface StudentProfileClientProps {
    student: any
    stats: {
        attendanceRate: number
        totalClasses: number
        presentCount: number
        lateCount: number
        absentCount: number
        points: number
        chartData: any[]
    }
    attendanceHistory: any[]
}

export function StudentProfileClient({ student, stats, attendanceHistory }: StudentProfileClientProps) {
    return (
        <div className="flex-1 space-y-6 p-8 pt-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/admin/students">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">Student Profile</h2>
                        <p className="text-muted-foreground">Comprehensive student information and analytics</p>
                    </div>
                </div>
                <EditStudentDialog student={student} />
            </div>

            {/* Profile Overview Cards */}
            <div className="grid gap-6 md:grid-cols-3">
                {/* Personal Info Card */}
                <Card className="col-span-1">
                    <CardHeader>
                        <CardTitle>Personal Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex flex-col items-center text-center">
                            <Avatar className="h-24 w-24 mb-4">
                                <AvatarImage src={student.avatar} />
                                <AvatarFallback className="text-2xl">{student.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <h3 className="text-xl font-semibold">{student.name}</h3>
                            <p className="text-sm text-muted-foreground">{student.registerNumber || "N/A"}</p>
                            <Badge variant="outline" className="mt-2 capitalize">{student.gender || "N/A"}</Badge>
                        </div>

                        <div className="space-y-3 text-sm">
                            <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4 text-muted-foreground" />
                                <span className="truncate">{student.email}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4 text-muted-foreground" />
                                <span>{student.phoneNumber || "N/A"}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <span>{student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString() : "N/A"}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <span>Blood: {student.bloodGroup || "N/A"}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Academic Info Card */}
                <Card className="col-span-2">
                    <CardHeader>
                        <CardTitle>Academic Information</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <p className="text-sm text-muted-foreground">Department</p>
                                <div className="flex items-center gap-2">
                                    <GraduationCap className="h-4 w-4" />
                                    <span className="font-medium">{student.departmentName}</span>
                                    <Badge variant="secondary">{student.departmentCode}</Badge>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <p className="text-sm text-muted-foreground">Class/Batch</p>
                                <span className="font-medium">{student.className}</span>
                            </div>
                            <div className="space-y-2">
                                <p className="text-sm text-muted-foreground">Year</p>
                                <span className="font-medium">Year {student.year || "N/A"}</span>
                            </div>
                            <div className="space-y-2">
                                <p className="text-sm text-muted-foreground">RFID Tag</p>
                                <code className="text-xs bg-muted px-2 py-1 rounded">{student.rfidTag || "Not Assigned"}</code>
                            </div>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-4 gap-4 mt-6">
                            <Card>
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-xs text-muted-foreground">Attendance</p>
                                            <p className="text-2xl font-bold">{stats.attendanceRate}%</p>
                                        </div>
                                        <TrendingUp className="h-8 w-8 text-green-500" />
                                    </div>
                                    <Progress value={stats.attendanceRate} className="mt-2" />
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-xs text-muted-foreground">Points</p>
                                            <p className="text-2xl font-bold">{stats.points}</p>
                                        </div>
                                        <Award className="h-8 w-8 text-yellow-500" />
                                    </div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-xs text-muted-foreground">Present</p>
                                            <p className="text-2xl font-bold text-green-600">{stats.presentCount}</p>
                                        </div>
                                        <CheckCircle2 className="h-8 w-8 text-green-500" />
                                    </div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-xs text-muted-foreground">Late</p>
                                            <p className="text-2xl font-bold text-orange-600">{stats.lateCount}</p>
                                        </div>
                                        <Clock className="h-8 w-8 text-orange-500" />
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Attendance Chart */}
            <Card>
                <CardHeader>
                    <CardTitle>Attendance Trend (Last 30 Days)</CardTitle>
                    <CardDescription>Daily attendance pattern visualization</CardDescription>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={stats.chartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="present" stroke="#22c55e" strokeWidth={2} name="Present" />
                            <Line type="monotone" dataKey="late" stroke="#f97316" strokeWidth={2} name="Late" />
                            <Line type="monotone" dataKey="absent" stroke="#ef4444" strokeWidth={2} name="Absent" />
                        </LineChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* Tabs for Additional Info */}
            <Tabs defaultValue="attendance" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="attendance">Attendance History</TabsTrigger>
                    <TabsTrigger value="parent">Parent Details</TabsTrigger>
                    <TabsTrigger value="address">Address</TabsTrigger>
                </TabsList>

                <TabsContent value="attendance" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Recent Attendance Records</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {attendanceHistory.slice(0, 10).map((record) => (
                                    <div key={record.id} className="flex items-center justify-between p-3 border rounded-lg">
                                        <div className="flex items-center gap-3">
                                            {record.status === "present" && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                                            {record.status === "late" && <Clock className="h-5 w-5 text-orange-500" />}
                                            {record.status === "absent" && <XCircle className="h-5 w-5 text-red-500" />}
                                            <div>
                                                <p className="font-medium capitalize">{record.status}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {new Date(record.date).toLocaleDateString()} at {new Date(record.date).toLocaleTimeString()}
                                                </p>
                                            </div>
                                        </div>
                                        <Badge variant="secondary">+{record.points} pts</Badge>
                                    </div>
                                ))}
                                {attendanceHistory.length === 0 && (
                                    <p className="text-center text-muted-foreground py-8">No attendance records found</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="parent" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Parent/Guardian Information</CardTitle>
                        </CardHeader>
                        <CardContent className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-3">
                                <div>
                                    <p className="text-sm text-muted-foreground">Father's Name</p>
                                    <p className="font-medium">{student.parent?.fatherName || "N/A"}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Mother's Name</p>
                                    <p className="font-medium">{student.parent?.motherName || "N/A"}</p>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <Phone className="h-4 w-4 text-muted-foreground" />
                                    <div>
                                        <p className="text-sm text-muted-foreground">Phone</p>
                                        <p className="font-medium">{student.parent?.parentPhone || "N/A"}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Phone className="h-4 w-4 text-muted-foreground" />
                                    <div>
                                        <p className="text-sm text-muted-foreground">WhatsApp</p>
                                        <p className="font-medium">{student.parent?.parentWhatsApp || "N/A"}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Mail className="h-4 w-4 text-muted-foreground" />
                                    <div>
                                        <p className="text-sm text-muted-foreground">Email</p>
                                        <p className="font-medium">{student.parent?.parentEmail || "N/A"}</p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="address" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Residential Address</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-start gap-3">
                                <MapPin className="h-5 w-5 text-muted-foreground mt-1" />
                                <div className="space-y-1">
                                    <p>{student.address?.doorNo}, {student.address?.street}</p>
                                    <p>{student.address?.area}</p>
                                    <p>{student.address?.city}, {student.address?.state}</p>
                                    <p className="font-medium">PIN: {student.address?.pincode || "N/A"}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
