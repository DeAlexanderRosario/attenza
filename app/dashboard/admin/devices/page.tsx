"use client"

import { useEffect, useState } from "react"
import { getDevices, getDeviceLogs, getAvailableRooms } from "@/app/actions/devices"
import { getClasses } from "@/app/actions/classes"
import { DeviceManagerClient } from "@/components/admin/device-manager-client"
import { Button } from "@/components/ui/button"
import { RefreshCw, LayoutGrid, List } from "lucide-react"

export default function DevicesPage() {
    const [devices, setDevices] = useState<any[]>([])
    const [logs, setLogs] = useState<any[]>([])
    const [rooms, setRooms] = useState<string[]>([])
    const [classes, setClasses] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)

    const fetchData = async () => {
        setIsLoading(true)
        try {
            const [d, l, r, c] = await Promise.all([
                getDevices(),
                getDeviceLogs(),
                getAvailableRooms(),
                getClasses()
            ])
            setDevices(d)
            setLogs(l)
            setRooms(r)
            setClasses(c)
        } catch (e) {
            console.error("Error fetching device data:", e)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [])

    return (
        <div className="space-y-8 p-1">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-black tracking-tighter bg-gradient-to-br from-indigo-400 to-white bg-clip-text text-transparent">
                        Infrastructure
                    </h1>
                    <p className="text-muted-foreground font-medium mt-1">
                        Monitor, pair, and manage your IoT edge nodes in real-time.
                    </p>
                </div>

                <div className="flex items-center gap-2 p-1 bg-muted/30 rounded-xl border border-white/5 backdrop-blur-sm shadow-inner">
                    <Button variant="ghost" size="sm" className="h-8 rounded-lg bg-indigo-500/10 text-indigo-400 font-bold">
                        <LayoutGrid className="w-4 h-4 mr-2" />
                        Classrooms
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 rounded-lg opacity-50 font-bold">
                        <List className="w-4 h-4 mr-2" />
                        Classic List
                    </Button>
                    <div className="w-px h-4 bg-white/10 mx-1" />
                    <Button
                        variant="ghost"
                        size="icon"
                        className={`h-8 w-8 rounded-lg ${isLoading ? 'animate-spin' : ''}`}
                        onClick={fetchData}
                        disabled={isLoading}
                    >
                        <RefreshCw className="w-4 h-4 opacity-50" />
                    </Button>
                </div>
            </div>

            {/* Main Content Area */}
            {isLoading ? (
                <div className="h-[600px] flex items-center justify-center bg-card/30 rounded-3xl border border-dashed border-white/10 grayscale opacity-50">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                        <span className="text-sm font-black uppercase tracking-[0.2em]">Synchronizing Hardware...</span>
                    </div>
                </div>
            ) : (
                <DeviceManagerClient
                    initialDevices={devices}
                    initialLogs={logs}
                    availableRooms={rooms}
                    initialClasses={classes}
                />
            )}
        </div>
    )
}
