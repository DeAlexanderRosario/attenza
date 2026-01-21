"use client"

import { AttendanceRecord } from "@/lib/types"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"

interface RecentAttendanceTableProps {
    initialData: (AttendanceRecord & { userName?: string, userRole?: string })[]
}

export function RecentAttendanceTable({ initialData }: RecentAttendanceTableProps) {
    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Device / Location</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {initialData.map((log) => (
                        <TableRow key={log.id}>
                            <TableCell className="font-medium">{log.userName || "Unknown ID: " + log.studentId}</TableCell>
                            <TableCell>
                                <Badge variant="outline" className="capitalize">{log.userRole || "N/A"}</Badge>
                            </TableCell>
                            <TableCell>{log.timestamp ? format(new Date(log.timestamp), "MMM d, h:mm a") : "N/A"}</TableCell>
                            <TableCell>
                                <Badge variant={log.status === "present" ? "default" : log.status === "late" ? "secondary" : "destructive"} className={log.status === "present" ? "bg-green-500 hover:bg-green-600" : ""}>
                                    {log.status}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                                {log.deviceId || "Main Gate"}
                            </TableCell>
                        </TableRow>
                    ))}
                    {initialData.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                No recent attendance records found.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    )
}
