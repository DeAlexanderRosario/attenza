"use client"

import { useState, useEffect } from "react"
import { Device } from "@/lib/types"
import { toggleDevicePower, updateDevicePairing, registerDevice, deleteDevice } from "@/app/actions/devices"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger
} from "@/components/ui/dialog"
import {
    RefreshCw, Power, Settings2, Wifi, WifiOff,
    MoreVertical, Activity, DoorOpen, Radio, HardDrive,
    ArrowUpRight, MonitorSmartphone, Plus, Save, Trash2
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { io } from "socket.io-client"
import { formatDistanceToNow } from "date-fns"

interface DeviceLog {
    id: string
    deviceId: string
    deviceName: string
    room: string
    type: string
    message: string
    timestamp: string | Date
}

export function DeviceManagerClient({
    initialDevices,
    initialLogs,
    availableRooms,
    initialClasses = []
}: {
    initialDevices: Device[],
    initialLogs: any[],
    availableRooms: string[],
    initialClasses?: any[]
}) {
    const [devices, setDevices] = useState(initialDevices)
    const [logs, setLogs] = useState<DeviceLog[]>(initialLogs)
    const [classes] = useState(initialClasses)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [isAssigning, setIsAssigning] = useState<Device | null>(null)
    const [isRegistering, setIsRegistering] = useState(false)
    const { toast } = useToast()

    const [newDevice, setNewDevice] = useState({ deviceId: "", name: "", type: "rfid_reader" })
    const [pairingData, setPairingData] = useState<{ room: string, placement: "inside" | "outside", classId?: string }>({ room: "", placement: "outside" })

    useEffect(() => {
        const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3003")
        socket.on("device_activity", (data: DeviceLog) => {
            setLogs(prev => [data, ...prev].slice(0, 20))
            if (data.type === "AUTH_SUCCESS") {
                setDevices(prev => prev.map(d =>
                    d.deviceId === data.deviceId ? { ...d, status: "online", lastSeen: new Date() } : d
                ))
            }
        })
        return () => { socket.disconnect() }
    }, [])

    const rooms = Array.from(new Set(devices.filter(d => d.room && d.room !== "Unassigned").map(d => d.room)))
    const unassignedDevices = devices.filter(d => !d.room || d.room === "Unassigned")

    const handlePowerToggle = async (id: string, currentStatus: string) => {
        try {
            const res = await toggleDevicePower(id, currentStatus)
            if (res.success) {
                setDevices(prev => prev.map(d => d.id === id ? { ...d, status: res.status as any } : d))
                toast({ title: "Power Updated", description: `Device is now ${res.status}` })
            }
        } catch (e) {
            toast({ title: "Error", description: "Failed to toggle power", variant: "destructive" })
        }
    }

    const handleRegister = async () => {
        if (!newDevice.deviceId || !newDevice.name) return
        try {
            const res = await registerDevice(newDevice)
            if (res.success) {
                setDevices(prev => [...prev, res.device as Device])
                setIsRegistering(false)
                setNewDevice({ deviceId: "", name: "", type: "rfid_reader" })
                toast({ title: "Success", description: "Device registered successfully" })
            } else {
                toast({ title: "Failed", description: res.message, variant: "destructive" })
            }
        } catch (e) {
            toast({ title: "Error", description: "Failed to register", variant: "destructive" })
        }
    }

    const handleUpdatePairing = async () => {
        if (!isAssigning) return
        try {
            const res = await updateDevicePairing(isAssigning.id, pairingData.room, pairingData.placement, pairingData.classId)
            if (res.success) {
                setDevices(prev => prev.map(d =>
                    d.id === isAssigning.id ? { ...d, room: pairingData.room, placement: pairingData.placement, classId: pairingData.classId } : d
                ))
                setIsAssigning(null)
                toast({ title: "Success", description: "Classroom pairing updated" })
            }
        } catch (e) {
            toast({ title: "Error", description: "Failed to pair device", variant: "destructive" })
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this device? This cannot be undone.")) return
        try {
            const res = await deleteDevice(id)
            if (res.success) {
                setDevices(prev => prev.filter(d => d.id !== id))
                toast({ title: "Deleted", description: "Device removed from infrastructure" })
            }
        } catch (e) {
            toast({ title: "Error", description: "Failed to delete device", variant: "destructive" })
        }
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3 space-y-6">

                {/* 0. Registration Trigger */}
                <div className="flex justify-end">
                    <Dialog open={isRegistering} onOpenChange={setIsRegistering}>
                        <DialogTrigger asChild>
                            <Button className="rounded-xl bg-indigo-500 hover:bg-indigo-600 shadow-lg shadow-indigo-500/20 font-bold px-6">
                                <Plus className="w-4 h-4 mr-2" />
                                Add New Hardware
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md bg-zinc-900 border-white/10 text-white shadow-2xl">
                            <DialogHeader>
                                <DialogTitle className="text-2xl font-black italic tracking-tighter">REGISTER HARDWARE</DialogTitle>
                                <DialogDescription className="text-zinc-400">Enter the IoT node details to whitelist it on the network.</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-indigo-400 tracking-widest">Hardware ID (UUID)</label>
                                    <Input
                                        placeholder="e.g., node_A205_inside"
                                        className="bg-white/5 border-white/10 h-11 rounded-xl"
                                        value={newDevice.deviceId}
                                        onChange={e => setNewDevice({ ...newDevice, deviceId: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-indigo-400 tracking-widest">Display Name</label>
                                    <Input
                                        placeholder="e.g., Room 205 Entrance"
                                        className="bg-white/5 border-white/10 h-11 rounded-xl"
                                        value={newDevice.name}
                                        onChange={e => setNewDevice({ ...newDevice, name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-indigo-400 tracking-widest">Hardware Type</label>
                                    <Select value={newDevice.type} onValueChange={v => setNewDevice({ ...newDevice, type: v as any })}>
                                        <SelectTrigger className="bg-white/5 border-white/10 h-11 rounded-xl">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-zinc-800 border-white/10 text-white">
                                            <SelectItem value="rfid_reader">RFID Reader</SelectItem>
                                            <SelectItem value="display_board">Display Board</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 font-bold rounded-xl" onClick={handleRegister}>
                                    Confirm Whitelist
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* 1. Classroom Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {rooms.map(room => (
                        <Card key={room} className="overflow-hidden border-indigo-500/10 hover:border-indigo-500/30 transition-all bg-card/50 backdrop-blur-sm shadow-xl">
                            <CardHeader className="bg-muted/30 pb-3 border-b border-white/5">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500">
                                            <MonitorSmartphone className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-lg font-black tracking-tight">{room}</CardTitle>
                                            <CardDescription className="text-[10px] font-bold uppercase tracking-widest opacity-50">Classroom Hub</CardDescription>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white/5"><Settings2 className="w-4 h-4 opacity-50" /></Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-4 space-y-4">
                                {devices.filter(d => d.room === room).map(device => (
                                    <div key={device.id} className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5 group hover:bg-white/10 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2.5 rounded-xl ${device.placement === 'outside' ? 'bg-orange-500/10 text-orange-500' : 'bg-emerald-500/10 text-emerald-500'
                                                }`}>
                                                {device.placement === 'outside' ? <DoorOpen className="w-5 h-5" /> : <Radio className="w-5 h-5" />}
                                            </div>
                                            <div>
                                                <div className="font-bold text-[9px] uppercase tracking-tighter opacity-40 flex items-center gap-1">
                                                    {device.placement} UNIT
                                                    {device.status === 'online' && <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />}
                                                </div>
                                                <div className="font-bold text-sm tracking-tight">{device.name}</div>
                                                <div className="text-[10px] opacity-30 font-mono italic">ID: {device.deviceId}</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 rounded-full hover:bg-white/10"
                                                onClick={() => {
                                                    setPairingData({ room: device.room, placement: device.placement, classId: device.classId });
                                                    setIsAssigning(device);
                                                }}
                                            >
                                                <Settings2 className="w-4 h-4 opacity-50 text-indigo-400" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className={`h-8 w-8 rounded-full ${device.status === 'online' ? 'text-green-500' : 'text-red-400'} hover:bg-white/10`}
                                                onClick={() => handlePowerToggle(device.id, device.status)}
                                            >
                                                <Power className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 rounded-full text-red-500 hover:bg-red-500/10"
                                                onClick={() => handleDelete(device.id)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* 2. Unassigned Devices */}
                {unassignedDevices.length > 0 && (
                    <Card className="border-dashed bg-transparent border-white/10">
                        <CardHeader>
                            <CardTitle className="text-xs font-black uppercase tracking-[0.2em] opacity-50">Unassigned Infrastructure</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {unassignedDevices.map(device => (
                                <div key={device.id} className="p-4 rounded-3xl border border-white/5 bg-zinc-900/50 flex flex-col gap-3 shadow-inner group">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="font-black text-sm tracking-tight">{device.name}</div>
                                            <div className="text-[10px] opacity-30 font-mono">{device.deviceId}</div>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 rounded-full text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={() => handleDelete(device.id)}
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </Button>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="mt-1 text-[10px] font-black uppercase tracking-widest h-8 rounded-xl border-white/5 hover:bg-indigo-500/10 hover:text-indigo-400"
                                        onClick={() => {
                                            setPairingData({ room: "Unassigned", placement: "outside", classId: device.classId });
                                            setIsAssigning(device);
                                        }}
                                    >
                                        Pair with Class
                                    </Button>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* 3. Live Activity Feed */}
            <div className="space-y-6">
                <Card className="h-full border-none bg-indigo-950/10 backdrop-blur-3xl shadow-2xl">
                    <CardHeader className="border-b border-white/5">
                        <div className="flex items-center gap-2 text-indigo-400">
                            <Activity className="w-4 h-4 animate-pulse text-indigo-500" />
                            <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em]">Telemetry Stream</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y divide-white/5 max-h-[800px] overflow-y-auto no-scrollbar">
                            {logs.map((log, idx) => (
                                <div key={log.id || idx} className="p-4 hover:bg-white/5 transition-colors group relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500 scale-y-0 group-hover:scale-y-100 transition-transform origin-top" />
                                    <div className="flex items-start justify-between gap-3 relative z-10">
                                        <div className="space-y-1.5">
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline" className={`text-[8px] h-3.5 px-1.5 uppercase font-black border-none rounded-sm shadow-sm ${log.type.includes('ERROR') ? 'bg-red-500/10 text-red-500' : 'bg-indigo-500/10 text-indigo-400'
                                                    }`}>
                                                    {log.type}
                                                </Badge>
                                                <span className="text-[9px] opacity-30 font-black italic">
                                                    {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                                                </span>
                                            </div>
                                            <p className="text-[11px] font-bold leading-relaxed tracking-tight opacity-90">{log.message}</p>
                                            <div className="flex items-center gap-1.5 text-[9px] opacity-30 font-black uppercase tracking-tighter">
                                                <HardDrive className="w-2.5 h-2.5" />
                                                {log.deviceName}
                                                <span className="mx-0.5">•</span>
                                                {log.room}
                                            </div>
                                        </div>
                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0">
                                            <ArrowUpRight className="w-3 h-3 text-indigo-400" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* 4. Pairing Dialog */}
            <Dialog open={!!isAssigning} onOpenChange={() => setIsAssigning(null)}>
                <DialogContent className="max-w-sm bg-zinc-950 border-white/10 text-white p-0 overflow-hidden shadow-2xl">
                    <div className="h-24 bg-gradient-to-br from-indigo-600/20 to-transparent p-6 flex flex-col justify-end border-b border-white/5">
                        <DialogTitle className="text-2xl font-black italic tracking-tighter">PAIR HARDWARE</DialogTitle>
                        <p className="text-[10px] font-bold opacity-50 uppercase tracking-widest leading-none">Mapping ID: {isAssigning?.deviceId}</p>
                    </div>

                    <div className="p-6 space-y-6">
                        <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase text-indigo-400 tracking-[0.2em] px-1">Classroom / Room</label>
                            <Select value={pairingData.room} onValueChange={v => setPairingData({ ...pairingData, room: v })}>
                                <SelectTrigger className="h-12 bg-white/5 border-white/5 rounded-2xl focus:ring-indigo-500/50">
                                    <SelectValue placeholder="Select a classroom" />
                                </SelectTrigger>
                                <SelectContent className="bg-zinc-900 border-white/10 text-white rounded-2xl">
                                    {availableRooms.map(room => (
                                        <SelectItem key={room} value={room} className="rounded-xl focus:bg-indigo-500/20">{room}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase text-indigo-400 tracking-[0.2em] px-1">Linked Class / Section</label>
                            <Select value={pairingData.classId} onValueChange={v => setPairingData({ ...pairingData, classId: v })}>
                                <SelectTrigger className="h-12 bg-white/5 border-white/5 rounded-2xl focus:ring-indigo-500/50">
                                    <SelectValue placeholder="Select Class/Section" />
                                </SelectTrigger>
                                <SelectContent className="bg-zinc-900 border-white/10 text-white rounded-2xl">
                                    <SelectItem value="unassigned" className="rounded-xl focus:bg-indigo-500/20 text-zinc-400 italic">No Class Link</SelectItem>
                                    {classes.map(c => (
                                        <SelectItem key={c.id} value={c.id} className="rounded-xl focus:bg-indigo-500/20">
                                            {c.departmentCode} - {c.name} ({c.section})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase text-indigo-400 tracking-[0.2em] px-1">Hardware Placement</label>
                            <div className="grid grid-cols-2 gap-2">
                                <Button
                                    variant="outline"
                                    className={`h-16 rounded-2xl border-white/5 flex flex-col gap-1 transition-all ${pairingData.placement === 'outside' ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-400 shadow-lg' : 'bg-transparent opacity-50'
                                        }`}
                                    onClick={() => setPairingData({ ...pairingData, placement: 'outside' })}
                                >
                                    <DoorOpen className="w-5 h-5" />
                                    <span className="text-[9px] font-black uppercase tracking-widest">Outside Unit</span>
                                </Button>
                                <Button
                                    variant="outline"
                                    className={`h-16 rounded-2xl border-white/5 flex flex-col gap-1 transition-all ${pairingData.placement === 'inside' ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-400 shadow-lg' : 'bg-transparent opacity-50'
                                        }`}
                                    onClick={() => setPairingData({ ...pairingData, placement: 'inside' })}
                                >
                                    <Radio className="w-5 h-5" />
                                    <span className="text-[9px] font-black uppercase tracking-widest">Inside Unit</span>
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 pt-0">
                        <Button className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 font-black rounded-2xl shadow-xl shadow-indigo-500/20 gap-2" onClick={handleUpdatePairing}>
                            <Save className="w-4 h-4" />
                            Apply Pairing
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
