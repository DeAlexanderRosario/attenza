"use client"

import { useAuth } from "@/lib/auth-context"
import { Navigation } from "@/components/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { User, Mail, CreditCard, Building2, GraduationCap, MapPin, ShieldCheck, LogOut, KeyRound, Loader2 } from "lucide-react"
import { useState } from "react"
import { updateStudentPassword } from "@/app/actions/student"
import { useToast } from "@/hooks/use-toast"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function StudentProfile() {
    const { user, logout } = useAuth()
    const { toast } = useToast()

    // Password state
    const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)
    const [passwords, setPasswords] = useState({ current: "", new: "", confirm: "" })

    const handlePasswordUpdate = async (e: React.FormEvent) => {
        e.preventDefault()
        if (passwords.new !== passwords.confirm) {
            toast({ title: "Error", description: "New passwords do not match", variant: "destructive" })
            return
        }

        setIsUpdatingPassword(true)
        try {
            const res = await updateStudentPassword({ current: passwords.current, new: passwords.new })
            if (res.success) {
                toast({ title: "Success", description: "Password updated successfully" })
                setPasswords({ current: "", new: "", confirm: "" })
            } else {
                toast({ title: "Error", description: res.message || "Failed to update password", variant: "destructive" })
            }
        } catch (error) {
            toast({ title: "Error", description: "Something went wrong", variant: "destructive" })
        } finally {
            setIsUpdatingPassword(false)
        }
    }

    if (!user) return null

    return (
        <div className="min-h-screen bg-background">
            <Navigation />
            <div className="container px-4 py-8 mx-auto max-w-6xl">
                <div className="flex flex-col lg:flex-row gap-8">

                    {/* Sidebar */}
                    <aside className="w-full lg:w-64 space-y-4">
                        <Card className="border-none shadow-lg bg-gradient-to-br from-primary/10 to-primary/5">
                            <CardContent className="pt-6 flex flex-col items-center text-center">
                                <Avatar className="w-24 h-24 mb-4 border-4 border-background shadow-xl">
                                    <AvatarImage src={user.avatar} />
                                    <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                                        {user.name.charAt(0)}
                                    </AvatarFallback>
                                </Avatar>
                                <h2 className="text-xl font-bold">{user.name}</h2>
                                <p className="text-sm text-muted-foreground mb-4">{user.role.toUpperCase()}</p>
                                <Badge variant="outline" className="mb-4">
                                    {user.points} Points
                                </Badge>
                            </CardContent>
                        </Card>

                        <nav className="space-y-1">
                            <Button variant="secondary" className="w-full justify-start" disabled>
                                <User className="mr-2 h-4 w-4" /> Personal Info
                            </Button>
                            <Button variant="ghost" className="w-full justify-start">
                                <CreditCard className="mr-2 h-4 w-4" /> RFID Status
                            </Button>
                            <Button variant="ghost" className="w-full justify-start text-destructive hover:text-destructive" onClick={() => logout()}>
                                <LogOut className="mr-2 h-4 w-4" /> Sign Out
                            </Button>
                        </nav>
                    </aside>

                    {/* Main Content */}
                    <main className="flex-1 space-y-6">

                        {/* Identity Section */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <ShieldCheck className="w-5 h-5 text-primary" />
                                    Academic Identity
                                </CardTitle>
                                <CardDescription>Your official student records</CardDescription>
                            </CardHeader>
                            <CardContent className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-muted-foreground uppercase">Full Name</label>
                                    <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                                        <User className="w-4 h-4 opacity-50" />
                                        <span className="font-medium">{user.name}</span>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-muted-foreground uppercase">Email Address</label>
                                    <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                                        <Mail className="w-4 h-4 opacity-50" />
                                        <span className="font-medium">{user.email}</span>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-muted-foreground uppercase">Department</label>
                                    <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                                        <Building2 className="w-4 h-4 opacity-50" />
                                        <span className="font-medium">{user.department || "N/A"}</span>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-muted-foreground uppercase">Current Year</label>
                                    <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                                        <GraduationCap className="w-4 h-4 opacity-50" />
                                        <span className="font-medium">Year {user.year} • Semester {user.semester}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* RFID Section */}
                        <Card className="border-l-4 border-l-primary">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <CreditCard className="w-5 h-5 text-primary" />
                                    RFID Access
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium">Tag ID</p>
                                    <p className="text-2xl font-mono text-muted-foreground tracking-widest">
                                        {user.rfidTag ? `•••• •••• ${user.rfidTag.slice(-4)}` : "Not Linked"}
                                    </p>
                                </div>
                                <Badge variant={user.rfidTag ? "default" : "destructive"}>
                                    {user.rfidTag ? "Active" : "Inactive"}
                                </Badge>
                            </CardContent>
                        </Card>

                    </main>
                </div>
            </div>
        </div>
    )
}
