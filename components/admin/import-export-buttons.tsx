"use client"

import { Button } from "@/components/ui/button"
import { Download, Upload } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useState, useRef } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { addStudent } from "@/app/actions/admin"
import { useRouter } from "next/navigation"

interface ImportExportButtonsProps {
    data: any[]
}

export function ImportExportButtons({ data }: ImportExportButtonsProps) {
    const { toast } = useToast()
    const router = useRouter()
    const [importDialogOpen, setImportDialogOpen] = useState(false)
    const [importing, setImporting] = useState(false)
    const [importResults, setImportResults] = useState<{ success: number, failed: number, errors: string[] } | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Export to CSV
    const handleExport = () => {
        if (data.length === 0) {
            toast({ title: "No Data", description: "No students to export", variant: "destructive" })
            return
        }

        // Define CSV headers
        const headers = [
            "Name", "Register Number", "Email", "Phone Number", "Gender", "Date of Birth", "Blood Group",
            "Department", "Class", "Year", "RFID Tag",
            "Father Name", "Mother Name", "Parent Phone", "Parent WhatsApp", "Parent Email",
            "Door No", "Street", "Area", "City", "State", "Pincode"
        ]

        // Convert data to CSV rows
        const rows = data.map(student => [
            student.name || "",
            student.registerNumber || "",
            student.email || "",
            student.phoneNumber || "",
            student.gender || "",
            student.dateOfBirth ? new Date(student.dateOfBirth).toISOString().split('T')[0] : "",
            student.bloodGroup || "",
            student.departmentName || student.department || "",
            student.className || "",
            student.year || "",
            student.rfidTag || "",
            student.parent?.fatherName || "",
            student.parent?.motherName || "",
            student.parent?.parentPhone || "",
            student.parent?.parentWhatsApp || "",
            student.parent?.parentEmail || "",
            student.address?.doorNo || "",
            student.address?.street || "",
            student.address?.area || "",
            student.address?.city || "",
            student.address?.state || "",
            student.address?.pincode || ""
        ])

        // Create CSV content
        const csvContent = [
            headers.join(","),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
        ].join("\n")

        // Download file
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
        const link = document.createElement("a")
        const url = URL.createObjectURL(blob)
        link.setAttribute("href", url)
        link.setAttribute("download", `students_export_${new Date().toISOString().split('T')[0]}.csv`)
        link.style.visibility = "hidden"
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)

        toast({ title: "Export Successful", description: `Exported ${data.length} students to CSV` })
    }

    // Import from CSV
    const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return

        setImporting(true)
        setImportResults(null)

        try {
            const text = await file.text()
            const lines = text.split("\n").filter(line => line.trim())

            if (lines.length < 2) {
                toast({ title: "Invalid File", description: "CSV file is empty or invalid", variant: "destructive" })
                setImporting(false)
                return
            }

            // Skip header row
            const dataLines = lines.slice(1)

            let successCount = 0
            let failedCount = 0
            const errors: string[] = []

            for (let i = 0; i < dataLines.length; i++) {
                const line = dataLines[i]
                // Parse CSV line (handle quoted values)
                const values = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g)?.map(v => v.replace(/^"|"$/g, '')) || []

                if (values.length < 3) {
                    errors.push(`Row ${i + 2}: Insufficient data`)
                    failedCount++
                    continue
                }

                try {
                    const result = await addStudent({
                        name: values[0] || "",
                        registerNumber: values[1] || "",
                        email: values[2] || "",
                        phoneNumber: values[3] || undefined,
                        gender: values[4] as any || undefined,
                        dateOfBirth: values[5] ? new Date(values[5]) : undefined,
                        bloodGroup: values[6] || undefined,
                        // Department and class would need to be resolved by name/code
                        // For now, we'll skip these and require manual assignment
                        year: values[9] ? parseInt(values[9]) : 1,
                        rfidTag: values[10] || undefined,
                        parent: {
                            fatherName: values[11] || undefined,
                            motherName: values[12] || undefined,
                            parentPhone: values[13] || undefined,
                            parentWhatsApp: values[14] || undefined,
                            parentEmail: values[15] || undefined,
                        },
                        address: {
                            doorNo: values[16] || undefined,
                            street: values[17] || undefined,
                            area: values[18] || undefined,
                            city: values[19] || undefined,
                            state: values[20] || undefined,
                            pincode: values[21] || undefined,
                        }
                    })

                    if (result.success) {
                        successCount++
                    } else {
                        errors.push(`Row ${i + 2}: ${result.message}`)
                        failedCount++
                    }
                } catch (error: any) {
                    errors.push(`Row ${i + 2}: ${error.message}`)
                    failedCount++
                }
            }

            setImportResults({ success: successCount, failed: failedCount, errors: errors.slice(0, 10) })

            if (successCount > 0) {
                router.refresh()
            }
        } catch (error) {
            toast({ title: "Import Failed", description: "Failed to parse CSV file", variant: "destructive" })
        } finally {
            setImporting(false)
            if (fileInputRef.current) {
                fileInputRef.current.value = ""
            }
        }
    }

    return (
        <>
            <div className="flex gap-2">
                <Button variant="outline" onClick={handleExport}>
                    <Download className="mr-2 h-4 w-4" />
                    Export CSV
                </Button>
                <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
                    <Upload className="mr-2 h-4 w-4" />
                    Import CSV
                </Button>
            </div>

            <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>Import Students from CSV</DialogTitle>
                        <DialogDescription>
                            Upload a CSV file with student data. The file should include columns for name, register number, email, and other details.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="csv-file">Select CSV File</Label>
                            <Input
                                id="csv-file"
                                type="file"
                                accept=".csv"
                                ref={fileInputRef}
                                onChange={handleImport}
                                disabled={importing}
                                className="mt-2"
                            />
                        </div>

                        {importing && (
                            <div className="text-center py-4">
                                <p className="text-sm text-muted-foreground">Importing students...</p>
                            </div>
                        )}

                        {importResults && (
                            <div className="space-y-2 p-4 border rounded-lg">
                                <h4 className="font-semibold">Import Results</h4>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div className="text-green-600">✓ Successful: {importResults.success}</div>
                                    <div className="text-red-600">✗ Failed: {importResults.failed}</div>
                                </div>
                                {importResults.errors.length > 0 && (
                                    <div className="mt-2">
                                        <p className="text-sm font-medium">Errors:</p>
                                        <ul className="text-xs text-muted-foreground space-y-1 mt-1 max-h-32 overflow-y-auto">
                                            {importResults.errors.map((error, i) => (
                                                <li key={i}>• {error}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="text-xs text-muted-foreground space-y-1">
                            <p><strong>Note:</strong> CSV format should include the following columns:</p>
                            <p>Name, Register Number, Email, Phone, Gender, DOB, Blood Group, Department, Class, Year, RFID, Father Name, Mother Name, Parent Phone, Parent WhatsApp, Parent Email, Door No, Street, Area, City, State, Pincode</p>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setImportDialogOpen(false)}>
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
