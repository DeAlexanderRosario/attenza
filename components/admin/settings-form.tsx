"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { updateSystemSettings, SystemSettings } from "@/app/actions/settings"
import { Loader2, Save, Clock, ShieldCheck, DoorOpen, Coffee } from "lucide-react"

interface SettingsFormProps {
    initialSettings: SystemSettings
}

export function SettingsForm({ initialSettings }: SettingsFormProps) {
    const [settings, setSettings] = useState<SystemSettings>(initialSettings)
    const [isSaving, setIsSaving] = useState(false)
    const { toast } = useToast()

    const handleSave = async () => {
        setIsSaving(true)
        try {
            const result = await updateSystemSettings(settings)
            if (result.success) {
                toast({
                    title: "Settings updated",
                    description: "System configuration has been saved successfully.",
                })
            } else {
                toast({
                    title: "Update failed",
                    description: result.error || "Could not save settings.",
                    variant: "destructive",
                })
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "An unexpected error occurred while saving.",
                variant: "destructive",
            })
        } finally {
            setIsSaving(false)
        }
    }

    const handleChange = (key: keyof SystemSettings, value: string) => {
        const numValue = parseInt(value, 10)
        setSettings(prev => ({
            ...prev,
            [key]: isNaN(numValue) ? 0 : numValue
        }))
    }

    return (
        <div className="grid gap-6 md:grid-cols-2">
            {/* Access Windows */}
            <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <DoorOpen className="size-5 text-primary" />
                        Access Windows
                    </CardTitle>
                    <CardDescription>Configure early access and free periods.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="earlyAccess">Early Access Window (Minutes)</Label>
                        <Input
                            id="earlyAccess"
                            type="number"
                            value={settings.earlyAccessWindowMins}
                            onChange={(e) => handleChange("earlyAccessWindowMins", e.target.value)}
                            className="bg-white/5 border-white/10"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="postClass">Post-Class Free Access (Hours)</Label>
                        <Input
                            id="postClass"
                            type="number"
                            value={settings.postClassFreeAccessHours}
                            onChange={(e) => handleChange("postClassFreeAccessHours", e.target.value)}
                            className="bg-white/5 border-white/10"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Operating Hours */}
            <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Clock className="size-5 text-primary" />
                        Operating Hours
                    </CardTitle>
                    <CardDescription>Set the classroom operating window.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="startHour">Operating Start Hour (24h format)</Label>
                        <Input
                            id="startHour"
                            type="number"
                            min="0"
                            max="23"
                            value={settings.operatingStartHour}
                            onChange={(e) => handleChange("operatingStartHour", e.target.value)}
                            className="bg-white/5 border-white/10"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="endHour">Operating End Hour (24h format)</Label>
                        <Input
                            id="endHour"
                            type="number"
                            min="0"
                            max="23"
                            value={settings.operatingEndHour}
                            onChange={(e) => handleChange("operatingEndHour", e.target.value)}
                            className="bg-white/5 border-white/10"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Grace Periods */}
            <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ShieldCheck className="size-5 text-primary" />
                        Attendance Policy
                    </CardTitle>
                    <CardDescription>Adjust teacher and student grace periods.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="teacherGrace">Teacher Grace Period (Minutes)</Label>
                        <Input
                            id="teacherGrace"
                            type="number"
                            value={settings.teacherGraceMins}
                            onChange={(e) => handleChange("teacherGraceMins", e.target.value)}
                            className="bg-white/5 border-white/10"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="studentFirst">First Slot Entry Window (Minutes)</Label>
                        <Input
                            id="studentFirst"
                            type="number"
                            value={settings.studentFirstSlotWindowMins}
                            onChange={(e) => handleChange("studentFirstSlotWindowMins", e.target.value)}
                            className="bg-white/5 border-white/10"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="studentRegular">Regular Slot Entry Window (Minutes)</Label>
                        <Input
                            id="studentRegular"
                            type="number"
                            value={settings.studentRegularWindowMins}
                            onChange={(e) => handleChange("studentRegularWindowMins", e.target.value)}
                            className="bg-white/5 border-white/10"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Breaks & Re-verification */}
            <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Coffee className="size-5 text-primary" />
                        Breaks & Re-verification
                    </CardTitle>
                    <CardDescription>Manage break timings and re-check windows.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="breakWarning">Break Warning (Minutes before end)</Label>
                        <Input
                            id="breakWarning"
                            type="number"
                            value={settings.breakWarningMins}
                            onChange={(e) => handleChange("breakWarningMins", e.target.value)}
                            className="bg-white/5 border-white/10"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="reVerification">Re-verification Window (Minutes)</Label>
                        <Input
                            id="reVerification"
                            type="number"
                            value={settings.reVerificationGraceMins}
                            onChange={(e) => handleChange("reVerificationGraceMins", e.target.value)}
                            className="bg-white/5 border-white/10"
                        />
                    </div>
                </CardContent>
            </Card>

            <div className="col-span-full flex justify-end gap-3 mt-4">
                <Button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground min-w-[120px] transition-all duration-300"
                >
                    {isSaving ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                        </>
                    ) : (
                        <>
                            <Save className="mr-2 h-4 w-4" />
                            Save Changes
                        </>
                    )}
                </Button>
            </div>
        </div>
    )
}
