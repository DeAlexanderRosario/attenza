"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Download, FileBarChart, PieChart, TrendingUp } from "lucide-react"

export default function TeacherReportsPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-foreground">Attendance Reports</h1>
                <p className="text-muted-foreground">Analyze and download class attendance data</p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                <Card>
                    <CardHeader>
                        <TrendingUp className="size-8 text-primary mb-2" />
                        <CardTitle>Weekly Insights</CardTitle>
                        <CardDescription>Detailed breakdown of attendance for the current week.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button className="w-full" variant="outline">
                            <Download className="mr-2 size-4" /> Export CSV
                        </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <PieChart className="size-8 text-chart-2 mb-2" />
                        <CardTitle>Monthly Summary</CardTitle>
                        <CardDescription>Consolidated attendance records for all your classes this month.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button className="w-full" variant="outline">
                            <Download className="mr-2 size-4" /> Export PDF
                        </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <FileBarChart className="size-8 text-chart-3 mb-2" />
                        <CardTitle>Defaulter List</CardTitle>
                        <CardDescription>Identify students with attendance below the required threshold.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button className="w-full" variant="outline">
                            <Download className="mr-2 size-4" /> View List
                        </Button>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Custom Report Generation</CardTitle>
                    <CardDescription>Select filters to generate a specific report.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="h-40 flex items-center justify-center border-2 border-dashed rounded-lg bg-muted/50">
                        <p className="text-muted-foreground uppercase text-xs font-bold tracking-widest">Report Builder Interface Placeholder</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
