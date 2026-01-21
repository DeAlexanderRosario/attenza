import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface ActivityItem {
    id: string
    user: string
    action: string
    time: string
    status: "success" | "warning" | "error" | "info"
    points?: number
}

interface RecentActivityProps {
    activities: ActivityItem[]
}

export function RecentActivity({ activities }: RecentActivityProps) {
    return (
        <Card className="col-span-3">
            <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>
                    Real-time system events and logs.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-8 max-h-[300px] overflow-y-auto pr-2">
                    {activities.length === 0 ? (
                        <div className="text-center text-muted-foreground py-8">No recent activity</div>
                    ) : activities.map((item) => (
                        <div key={item.id} className="flex items-center">
                            <Avatar className="h-9 w-9">
                                <AvatarFallback className={
                                    item.status === 'error' ? 'bg-destructive/10 text-destructive' :
                                        item.status === 'warning' ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-500' :
                                            'bg-primary/10 text-primary'
                                }>
                                    {item.user.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <div className="ml-4 space-y-1">
                                <p className="text-sm font-medium leading-none">{item.user}</p>
                                <p className="text-sm text-muted-foreground">
                                    {item.action} • {item.time}
                                </p>
                            </div>
                            <div className="ml-auto flex flex-col items-end gap-1">
                                {item.points && (
                                    <span className="text-xs font-medium text-green-600">+{item.points} pts</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
