"use client"

import { useState } from "react"
import { Device } from "@/lib/types"
import { toggleDeviceStatus } from "@/app/actions/admin"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RefreshCw, Power, Settings2, Wifi, WifiOff } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export function DevicesList({ initialDevices }: { initialDevices: Device[] }) {
    const [devices, setDevices] = useState(initialDevices)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const { toast } = useToast()

    const handleRefresh = async () => {
        setIsRefreshing(true)
        // In real app, re-fetch via server action or router.refresh
        window.location.reload()
    }

    const handleToggle = async (id: string, currentStatus: string) => {
        const newStatus = currentStatus === "online" ? "offline" : "online"
        try {
            await toggleDeviceStatus(id, newStatus)
            setDevices(devices.map(d => d.id === id ? { ...d, status: newStatus as any } : d))
            toast({ title: "Status Updated", description: `Device is now ${newStatus}` })
        } catch (e) {
            toast({ title: "Error", description: "Failed to update device", variant: "destructive" })
        }
    }

    return (
        <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-3">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Online Devices</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-success">
                            {devices.filter(d => d.status === "online").length} / {devices.length}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Critical Alerts</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-destructive">
                            {devices.filter(d => d.status === "offline").length}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Connected Hardware</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <div className="grid grid-cols-6 gap-4 p-4 font-medium text-sm text-muted-foreground border-b bg-muted/40">
                            <div className="col-span-2">Device Name</div>
                            <div>Type</div>
                            <div>Location</div>
                            <div>Status</div>
                            <div className="text-right">Actions</div>
                        </div>
                        {devices.map(device => (
                            <div key={device.id} className="grid grid-cols-6 gap-4 p-4 items-center text-sm border-b last:border-0 hover:bg-muted/5 transition-colors">
                                <div className="col-span-2 flex items-center gap-3">
                                    <div className={`w-2 h-2 rounded-full ${device.status === "online" ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" :
                                            device.status === "offline" ? "bg-red-500" : "bg-yellow-500"
                                        }`} />
                                    <div className="font-medium">{device.name}</div>
                                </div>
                                <div>{device.type}</div>
                                <div className="text-muted-foreground">{device.location}</div>
                                <div>
                                    <Badge variant={
                                        device.status === "online" ? "outline" :
                                            device.status === "offline" ? "destructive" : "secondary"
                                    } className={device.status === "online" ? "text-green-600 border-green-200 bg-green-50" : ""}>
                                        {device.status === "online" ? <Wifi className="w-3 h-3 mr-1" /> : <WifiOff className="w-3 h-3 mr-1" />}
                                        {device.status.toUpperCase()}
                                    </Badge>
                                </div>
                                <div className="flex justify-end gap-2">
                                    <Button size="sm" variant="outline" onClick={() => handleToggle(device.id, device.status)}>
                                        <Power className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                        {devices.length === 0 && (
                            <div className="p-8 text-center text-muted-foreground">No devices registered.</div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
