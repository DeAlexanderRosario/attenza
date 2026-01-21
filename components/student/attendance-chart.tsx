"use client"

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AttendanceRecord } from "@/lib/types"

interface AttendanceChartProps {
    data: { date: string; attended: number; total: number }[]
    overallPercentage: number
    status: "Safe" | "At Risk" | "Recoverable"
}

export function AttendanceChart({ data, overallPercentage, status }: AttendanceChartProps) {
    const getStatusColor = (s: string) => {
        switch (s) {
            case "Safe": return "text-emerald-500"
            case "Recoverable": return "text-amber-500"
            case "At Risk": return "text-red-500"
            default: return "text-slate-500"
        }
    }

    return (
        <Card className="col-span-2 overflow-hidden border-none shadow-xl bg-gradient-to-br from-background to-muted/20">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Attendance Trends</CardTitle>
                        <CardDescription>Your last 7 days activity</CardDescription>
                    </div>
                    <div className="text-right">
                        <div className={`text-3xl font-bold ${getStatusColor(status)}`}>{overallPercentage}%</div>
                        <Badge variant={status === "Safe" ? "default" : "destructive"}>{status}</Badge>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="h-[200px] w-full mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorAttended" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <XAxis dataKey="date" hide />
                            <Tooltip
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                            <Area
                                type="monotone"
                                dataKey="attended"
                                stroke="hsl(var(--primary))"
                                fillOpacity={1}
                                fill="url(#colorAttended)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    )
}
