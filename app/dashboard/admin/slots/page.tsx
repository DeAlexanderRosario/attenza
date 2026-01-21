import { SlotConfigurationTable } from "@/components/admin/timetable/slot-configuration-table"

export default function SlotConfigurationPage() {
    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Time Slot Configuration</h2>
                    <p className="text-muted-foreground">
                        Manage college-wide time slots used across all classes
                    </p>
                </div>
            </div>
            <SlotConfigurationTable />
        </div>
    )
}
