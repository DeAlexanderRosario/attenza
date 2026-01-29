import { Trophy } from "lucide-react"
import { getLeaderboard } from "@/lib/db-helpers"
import { getSessionUser } from "@/lib/session"
import { LeaderboardContainer } from "@/components/student/leaderboard-container"

export default async function LeaderboardPage() {
    const sessionUser = await getSessionUser()
    if (!sessionUser) return null

    const leaderboard = await getLeaderboard({
        organizationId: sessionUser.organizationId,
        departmentId: sessionUser.departmentId,
        classId: sessionUser.classId
    })

    return (
        <div className="space-y-6 pb-20">
            <div className="text-center space-y-2 mb-8">
                <h1 className="text-4xl font-black italic tracking-tighter uppercase text-primary flex items-center justify-center gap-3">
                    <Trophy className="w-10 h-10 text-yellow-500 fill-yellow-500" />
                    Student Rankings
                </h1>
                <p className="text-muted-foreground font-medium">Compete with your peers and earn rewards!</p>
            </div>

            <div className="max-w-4xl mx-auto">
                <LeaderboardContainer
                    currentUserId={sessionUser.id}
                    initialData={leaderboard}
                />
            </div>
        </div>
    )
}
