"use client"

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Progress } from "@/components/ui/progress"

interface SubjectAttendance {
    subjectName: string
    subjectCode: string
    total: number
    attended: number
    percentage: number
}

interface SubjectAttendanceTableProps {
    data: SubjectAttendance[]
}

export function SubjectAttendanceTable({ data }: SubjectAttendanceTableProps) {
    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Subject</TableHead>
                        <TableHead>Code</TableHead>
                        <TableHead className="text-center">Attended / Total</TableHead>
                        <TableHead>Attendance %</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={4} className="h-24 text-center">
                                No subject data found.
                            </TableCell>
                        </TableRow>
                    ) : (
                        data.map((subject) => (
                            <TableRow key={subject.subjectCode}>
                                <TableCell className="font-medium">
                                    {subject.subjectName}
                                </TableCell>
                                <TableCell>{subject.subjectCode}</TableCell>
                                <TableCell className="text-center">
                                    <div className="font-semibold text-lg">
                                        {subject.attended} / {subject.total}
                                    </div>
                                    <div className="text-xs text-muted-foreground uppercase">Classes Held</div>
                                </TableCell>
                                <TableCell className="min-w-[200px]">
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className={`font-bold ${subject.percentage >= 75 ? 'text-success' : 'text-destructive'}`}>
                                                {subject.percentage}%
                                            </span>
                                            {subject.percentage < 75 && (
                                                <span className="text-xs text-destructive animate-pulse font-medium">
                                                    Action Required
                                                </span>
                                            )}
                                        </div>
                                        <Progress
                                            value={subject.percentage}
                                            className="h-2"
                                            indicatorClassName={subject.percentage >= 75 ? "bg-success" : "bg-destructive"}
                                        />
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    )
}
