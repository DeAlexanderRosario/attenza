"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { getDetailedAttendanceReport } from "@/app/actions/attendance"
import { Download, FileDown, Loader2 } from "lucide-react"

export function ExportControls() {
    const [loading, setLoading] = useState(false)

    async function handleExport(type: "monthly" | "daily") {
        setLoading(true)
        try {
            // Include current filters if they were shared context (simplified here)
            const result = await getDetailedAttendanceReport(type, {})

            if (!result || result.length === 0) {
                alert("No attendance data found to export.")
                setLoading(false)
                return
            }

            // Client-side CSV generation
            const headers = ["Date", "Time", "Student Name", "Student ID", "Department", "Course", "Status", "Points"]
            const csvContent = [
                headers.join(","),
                ...result.map(row => [
                    row.date || "",
                    row.time || "",
                    `"${row.studentName || ""}"`,
                    row.studentId || "",
                    row.department || "",
                    `"${row.course || "N/A"}"`,
                    row.status || "",
                    row.points || "0"
                ].join(","))
            ].join("\n")

            const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
            const url = URL.createObjectURL(blob)
            const link = document.createElement("a")
            link.href = url
            link.setAttribute("download", `attendance_report_${type}_${new Date().toISOString().split('T')[0]}.csv`)
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            URL.revokeObjectURL(url)

            alert(`Successfully exported ${result.length} attendance records.`)
        } catch (error) {
            console.error("Export error:", error)
            alert("Failed to export attendance data. Please check the console for details.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => handleExport("daily")} disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
                Daily Report (CSV)
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleExport("monthly")} disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                Monthly Report (CSV)
            </Button>
        </div>
    )
}
