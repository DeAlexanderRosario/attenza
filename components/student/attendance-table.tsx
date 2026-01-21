"use client"

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
import type { AttendanceRecord, Slot } from "@/lib/types"

interface AttendanceTableProps {
    data: AttendanceRecord[]
    slots?: Slot[] // Optional, to map slot details if needed
}

export function AttendanceTable({ data }: AttendanceTableProps) {
    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>Course</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Points</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center">
                                No attendance records found.
                            </TableCell>
                        </TableRow>
                    ) : (
                        data.map((record) => (
                            <TableRow key={record.id}>
                                <TableCell className="font-medium">
                                    {format(new Date(record.timestamp), "PPP")}
                                </TableCell>
                                <TableCell>
                                    {format(new Date(record.timestamp), "p")}
                                </TableCell>
                                <TableCell>
                                    {/* Ideally we would map slotId to Course Name here if not in record */}
                                    {/* For now, assuming we might need to fetch or current mock data suffices, 
                       but record doesn't have courseName. 
                       In a real app, we'd probably join this data or having it in the record.
                       Let's check the API response or Types again. 
                       Record has slotId. 
                   */}
                                    {record.slotId}
                                </TableCell>
                                <TableCell>
                                    <Badge variant={record.status === "present" ? "default" : "destructive"}>
                                        {record.status}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right">{record.pointsEarned}</TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    )
}
