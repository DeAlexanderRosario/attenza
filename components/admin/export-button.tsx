"use client"

import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"

interface ExportButtonProps {
    data: any[]
    filename?: string
}

export function ExportButton({ data, filename = "export.csv" }: ExportButtonProps) {
    const handleExport = () => {
        if (!data || data.length === 0) return

        // Get headers from first object
        const headers = Object.keys(data[0])

        // Convert to CSV string
        const csvContent = [
            headers.join(","),
            ...data.map(row => headers.map(header => {
                const val = row[header]
                // Handle strings with commas, nulls, objects
                if (val === null || val === undefined) return ""
                if (typeof val === "object") return JSON.stringify(val).replace(/"/g, '""') // Basic object handling
                return `"${String(val).replace(/"/g, '""')}"`
            }).join(","))
        ].join("\n")

        // Create download link
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = url
        link.setAttribute("download", filename)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    return (
        <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
        </Button>
    )
}
