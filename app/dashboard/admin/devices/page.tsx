"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RefreshCw, Power, Settings2, Wifi, WifiOff } from "lucide-react"

// Mock Data for Prototype
const INITIAL_DEVICES = [
    { id: "d1", name: "Main Entrance Reader", type: "RFID Reader", location: "Gate 1", status: "online", lastPing: "2 mins ago" },
    { id: "d2", name: "Library Check-in", type: "RFID Reader", location: "Library", status: "online", lastPing: "1 min ago" },
    { id: "d3", name: "Classroom 303 Reader", type: "RFID Reader", location: "Room 303", status: "offline", lastPing: "4 hours ago" },
    { id: "d4", name: "Corridor Display", type: "Display Board", location: "1st Floor Hall", status: "maintenance", lastPing: "1 day ago" },
]

export default function DevicesPage() {
    const [devices, setDevices] = useState(INITIAL_DEVICES)
    const [isRefreshing, setIsRefreshing] = useState(false)

    const handleRefresh = () => {
        setIsRefreshing(true)
        // Simulate network request
        setTimeout(() => setIsRefreshing(false), 1000)
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Devices & Infrastructure</h1>
                    <p className="text-muted-foreground">Monitor and configure Smart School IoT hardware.</p>
                </div>
                <Button onClick={handleRefresh} disabled={isRefreshing}>
                    <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                    Refresh Status
                </Button>
            </div>

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
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Maintenance Mode</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-warning">
                            {devices.filter(d => d.status === "maintenance").length}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Connected Hardware</CardTitle>
                    <CardDescription>Real-time status of all registered readers and displays.</CardDescription>
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
                                    <div className="text-[10px] text-muted-foreground mt-1">Ping: {device.lastPing}</div>
                                </div>
                                <div className="flex justify-end gap-2">
                                    <Button size="sm" variant="outline" title="Reboot">
                                        <Power className="w-4 h-4" />
                                    </Button>
                                    <Button size="sm" variant="outline" title="Configure">
                                        <Settings2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
