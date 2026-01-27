"use client"

import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

export default function TeacherSettingsPage() {
    const { user } = useAuth()

    if (!user) return null

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-foreground">Account Settings</h1>
                <p className="text-muted-foreground">Manage your profile and preferences</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Profile Information</CardTitle>
                    <CardDescription>Update your personal details here.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="name">Full Name</Label>
                            <Input id="name" defaultValue={user.name} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email Address</Label>
                            <Input id="email" defaultValue={user.email} disabled />
                        </div>
                    </div>
                    <Separator />
                    <div className="space-y-2">
                        <Label htmlFor="dept">Department</Label>
                        <Input id="dept" defaultValue={user.department} disabled />
                    </div>
                    <Button>Save Changes</Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Security</CardTitle>
                    <CardDescription>Change your password and manage session security.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2 max-w-sm">
                        <Label htmlFor="curr">Current Password</Label>
                        <Input id="curr" type="password" />
                    </div>
                    <div className="grid gap-4 md:grid-cols-2 max-w-2xl">
                        <div className="space-y-2">
                            <Label htmlFor="new">New Password</Label>
                            <Input id="new" type="password" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="conf">Confirm New Password</Label>
                            <Input id="conf" type="password" />
                        </div>
                    </div>
                    <Button variant="outline">Update Password</Button>
                </CardContent>
            </Card>
        </div>
    )
}
