import { getDepartments } from "@/app/actions/department"
import { getTimeSlots } from "@/app/actions/admin"
import { InteractiveTimetableGrid } from "@/components/admin/timetable/interactive-timetable-grid"
import { TimeSlotConfigDialog } from "@/components/admin/timetable/time-slot-config-dialog"
import { OrganizationSlotManager } from "@/components/admin/timetable/organization-slot-manager"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Clock, Calendar } from "lucide-react"

export default async function TimetablePage() {
    const [departments, timeSlots] = await Promise.all([
        getDepartments(),
        getTimeSlots()
    ])

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Timetable Management</h2>
                    <p className="text-muted-foreground">
                        Configure organization-wide time slots and map subjects to classes
                    </p>
                </div>
                <TimeSlotConfigDialog initialSlots={timeSlots} />
            </div>

            <Tabs defaultValue="class-timetables" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="class-timetables" className="gap-2">
                        <Calendar className="h-4 w-4" />
                        Class Timetables
                    </TabsTrigger>
                    <TabsTrigger value="organization-slots" className="gap-2">
                        <Clock className="h-4 w-4" />
                        Organization Slots
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="class-timetables" className="space-y-4">
                    <InteractiveTimetableGrid departments={departments} />
                </TabsContent>

                <TabsContent value="organization-slots" className="space-y-4">
                    <OrganizationSlotManager />
                </TabsContent>
            </Tabs>
        </div>
    )
}
