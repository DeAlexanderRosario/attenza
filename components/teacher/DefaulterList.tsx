"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Search, AlertTriangle, Send, UserX } from "lucide-react"
import { getDefaulterList } from "@/app/actions/attendance"
import { Button } from "@/components/ui/button"

export function DefaulterList() {
    const [defaulters, setDefaulters] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [query, setQuery] = useState("")

    useEffect(() => {
        async function fetchData() {
            try {
                const data = await getDefaulterList(75)
                setDefaulters(data)
            } catch (error) {
                console.error("Failed to fetch defaulters:", error)
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [])

    const filtered = defaulters.filter(d =>
        d.name.toLowerCase().includes(query.toLowerCase()) ||
        d.email?.toLowerCase().includes(query.toLowerCase())
    )

    return (
        <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <CardTitle className="text-xl font-black flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-rose-500" />
                            Attendance Defaulters
                        </CardTitle>
                        <CardDescription>Students with attendance below 75% threshold</CardDescription>
                    </div>
                    <Badge variant="outline" className="text-rose-600 bg-rose-50 border-rose-200 uppercase font-black tracking-widest text-[10px]">
                        {defaulters.length} STUDENTS
                    </Badge>
                </div>
                <div className="pt-4 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search defaulters..."
                        className="pl-10 h-10 bg-background/50 border-border/50 rounded-xl"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                </div>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="py-12 flex flex-col items-center justify-center gap-4">
                        <div className="h-8 w-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Analyzing Records...</p>
                    </div>
                ) : filtered.length > 0 ? (
                    <div className="space-y-3">
                        {filtered.map((student) => (
                            <div key={student.studentId} className="group p-4 rounded-2xl border border-border/40 bg-background hover:border-rose-500/30 hover:bg-rose-500/[0.02] transition-all flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500 ring-2 ring-rose-500/5">
                                        <UserX className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-sm group-hover:text-rose-600 transition-colors">{student.name}</h4>
                                        <p className="text-[10px] text-muted-foreground font-mono">{student.registerNumber || student.email}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-6">
                                    <div className="text-right">
                                        <div className="text-sm font-black text-rose-500">{Math.round(student.attendanceRate)}%</div>
                                        <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-tighter">Attendance</p>
                                    </div>
                                    <Button size="icon" variant="ghost" className="h-9 w-9 rounded-full hover:bg-rose-500 hover:text-white transition-all">
                                        <Send className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="py-12 text-center text-muted-foreground space-y-2">
                        <div className="h-12 w-12 rounded-full bg-muted mx-auto flex items-center justify-center">
                            <CheckCircle className="h-6 w-6 text-emerald-500" />
                        </div>
                        <p className="text-sm font-medium">No students below threshold.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

import { CheckCircle } from "lucide-react"
