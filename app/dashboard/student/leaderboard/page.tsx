"use client"

import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Trophy, Crown } from "lucide-react"

// Mock Leaderboard Data
const leaderboard = [
    { rank: 1, name: "Sarah Jenkins", points: 2450, avatar: "", streak: 15 },
    { rank: 2, name: "Mike Chen", points: 2320, avatar: "", streak: 12 },
    { rank: 3, name: "Emma Wilson", points: 2180, avatar: "", streak: 8 },
    { rank: 4, name: "Rahul Gupta", points: 1950, avatar: "", streak: 5 },
    { rank: 14, name: "Alex Rohan", points: 1250, avatar: "", streak: 3 }, // Current User
]

export default function LeaderboardPage() {
    return (
        <div className="space-y-6">
            <div className="text-center space-y-2 mb-8">
                <h1 className="text-3xl font-bold flex items-center justify-center gap-2">
                    <Trophy className="w-8 h-8 text-yellow-500" />
                    Class Leaderboard
                </h1>
                <p className="text-muted-foreground">Top performing students this semester</p>
            </div>

            <div className="space-y-4 max-w-3xl mx-auto">
                {leaderboard.map((student) => (
                    <Card key={student.rank} className={`
                flex items-center p-4 transition-all hover:scale-[1.01]
                ${student.rank <= 3 ? "border-yellow-500/50 bg-yellow-500/5" : ""}
                ${student.rank === 14 ? "border-primary ring-1 ring-primary/20 sticky bottom-4 shadow-xl z-10 bg-background" : ""}
            `}>
                        <div className="flex-none w-12 text-center font-bold text-xl text-muted-foreground">
                            #{student.rank}
                        </div>

                        <Avatar className="w-12 h-12 border-2 border-background shadow-sm">
                            <AvatarImage src={student.avatar} />
                            <AvatarFallback>{student.name.charAt(0)}</AvatarFallback>
                        </Avatar>

                        <div className="flex-1 ml-4">
                            <h3 className="font-semibold text-lg flex items-center gap-2">
                                {student.name}
                                {student.rank === 1 && <Crown className="w-4 h-4 text-yellow-500 fill-yellow-500" />}
                                {student.rank === 14 && <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">YOU</span>}
                            </h3>
                            <p className="text-sm text-muted-foreground">{student.streak} Day Streak 🔥</p>
                        </div>

                        <div className="text-right">
                            <div className="font-bold text-xl text-primary">{student.points}</div>
                            <div className="text-xs text-muted-foreground">Points</div>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    )
}
