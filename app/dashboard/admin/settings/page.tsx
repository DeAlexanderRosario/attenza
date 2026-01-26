import { getSystemSettings } from "@/app/actions/settings"
import { SettingsForm } from "@/components/admin/settings-form"
import { Settings } from "lucide-react"

export default async function AdminSettingsPage() {
    const initialSettings = await getSystemSettings()

    return (
        <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
            <div className="flex items-center justify-between space-y-2">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-xl">
                        <Settings className="size-6 text-primary" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">System Settings</h2>
                        <p className="text-muted-foreground italic">
                            Manage global classroom timings, grace periods, and access policies.
                        </p>
                    </div>
                </div>
            </div>

            <div className="mt-8">
                <SettingsForm initialSettings={initialSettings} />
            </div>
        </div>
    )
}
