"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Scan, CheckCircle, XCircle, Power } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface RFIDScannerProps {
  slotId: string
  onScanComplete?: (rfidTag: string, status: "present" | "late") => void
}

export function RFIDScanner({ slotId, onScanComplete }: RFIDScannerProps) {
  const [isScanning, setIsScanning] = useState(true)
  const [lastScanned, setLastScanned] = useState<{
    tag: string
    status: "present" | "late"
    timestamp: Date
    studentName?: string
  } | null>(null)
  const [scanStats, setScanStats] = useState({ total: 0, present: 0, late: 0 })
  const { toast } = useToast()

  useEffect(() => {
    if (!isScanning || !slotId) return

    const interval = setInterval(async () => {
      const mockRfidTags = ["RFID001", "RFID002", "RFID003", "RFID004", "RFID005"]
      const randomTag = mockRfidTags[Math.floor(Math.random() * mockRfidTags.length)]
      const status = Math.random() > 0.2 ? "present" : "late"

      try {
        const response = await fetch("/api/users")
        const users = await response.json()
        const student = users.find((u: any) => u.rfidTag === randomTag)

        if (student) {
          const existingAttendance = await fetch(`/api/attendance?slotId=${slotId}&studentId=${student.id}`)
          const existingData = await existingAttendance.json()

          if (existingData.length === 0) {
            await fetch("/api/attendance", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                studentId: student.id,
                slotId,
                rfidTag: randomTag,
                status,
                points: status === "present" ? 10 : 5,
                location: "Scanner 1",
              }),
            })

            setLastScanned({
              tag: randomTag,
              status,
              timestamp: new Date(),
              studentName: student.name,
            })

            setScanStats((prev) => ({
              total: prev.total + 1,
              present: prev.present + (status === "present" ? 1 : 0),
              late: prev.late + (status === "late" ? 1 : 0),
            }))

            toast({
              title: "Student Checked In",
              description: `${student.name} marked as ${status}`,
            })

            onScanComplete?.(randomTag, status)
          }
        }
      } catch (error) {
        console.error("[v0] Error saving attendance:", error)
        toast({
          title: "Scan Error",
          description: "Failed to save attendance record",
          variant: "destructive",
        })
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [isScanning, slotId, onScanComplete, toast])

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <Scan className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-foreground">RFID Scanner</CardTitle>
              <CardDescription>Monitoring for student check-ins</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-foreground">
              {scanStats.total} scans
            </Badge>
            <Badge variant={isScanning ? "default" : "secondary"} className="bg-success text-success-foreground">
              {isScanning ? "Active" : "Inactive"}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Button
            variant={isScanning ? "destructive" : "default"}
            className="w-full"
            onClick={() => setIsScanning(!isScanning)}
          >
            <Power className="mr-2 h-4 w-4" />
            {isScanning ? "Stop Scanner" : "Start Scanner"}
          </Button>

          <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/30 p-8">
            {isScanning ? (
              <div className="text-center">
                <div className="mx-auto mb-3 h-16 w-16 animate-pulse rounded-full bg-primary/20" />
                <p className="text-sm font-medium text-foreground">Scanning for RFID tags...</p>
                <p className="text-xs text-muted-foreground mt-1">Ready to detect student cards</p>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-sm font-medium text-muted-foreground">Scanner Inactive</p>
                <p className="text-xs text-muted-foreground mt-1">Click the button above to activate</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg border border-border bg-card p-3 text-center">
              <p className="text-2xl font-bold text-foreground">{scanStats.total}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-3 text-center">
              <p className="text-2xl font-bold text-success">{scanStats.present}</p>
              <p className="text-xs text-muted-foreground">On Time</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-3 text-center">
              <p className="text-2xl font-bold text-warning">{scanStats.late}</p>
              <p className="text-xs text-muted-foreground">Late</p>
            </div>
          </div>

          {lastScanned && (
            <div className="rounded-lg border border-border bg-card p-4 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Last Scan</p>
                  <p className="text-xs text-muted-foreground">{lastScanned.timestamp.toLocaleTimeString()}</p>
                  <p className="mt-2 text-sm font-semibold text-foreground">{lastScanned.studentName}</p>
                  <p className="text-xs text-muted-foreground">Tag: {lastScanned.tag}</p>
                </div>
                {lastScanned.status === "present" ? (
                  <Badge variant="default" className="bg-success text-success-foreground">
                    <CheckCircle className="mr-1 h-3 w-3" />
                    On Time
                  </Badge>
                ) : (
                  <Badge variant="default" className="bg-warning text-warning-foreground">
                    <XCircle className="mr-1 h-3 w-3" />
                    Late
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
