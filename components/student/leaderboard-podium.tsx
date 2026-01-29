"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Crown, Trophy, Medal } from "lucide-react"
import type { LeaderboardEntry } from "@/lib/types"

interface LeaderboardPodiumProps {
    topThree: LeaderboardEntry[]
}

export function LeaderboardPodium({ topThree }: LeaderboardPodiumProps) {
    // Sort into order: 2, 1, 3 for podium display
    const displayOrder = [
        topThree.find(s => s.rank === 2),
        topThree.find(s => s.rank === 1),
        topThree.find(s => s.rank === 3),
    ].filter(Boolean) as LeaderboardEntry[]

    if (displayOrder.length === 0) return null

    return (
        <div className="flex items-end justify-center gap-2 md:gap-8 pt-12 pb-8 px-4 overflow-x-auto">
            {displayOrder.map((student) => {
                const isFirst = student.rank === 1
                const isSecond = student.rank === 2
                const isThird = student.rank === 3

                return (
                    <div
                        key={student.studentId}
                        className={`flex flex-col items-center group transition-all duration-500 hover:scale-105 ${isFirst ? "order-2 mb-4" : isSecond ? "order-1" : "order-3"
                            }`}
                    >
                        <div className="relative mb-4">
                            {/* Crown/Trophy Decoration */}
                            {isFirst && (
                                <div className="absolute -top-8 left-1/2 -translate-x-1/2 animate-bounce">
                                    <Crown className="w-10 h-10 text-yellow-500 fill-yellow-500 drop-shadow-[0_0_10px_rgba(234,179,8,0.5)]" />
                                </div>
                            )}

                            {/* Avatar Circle */}
                            <div className={`relative p-1 rounded-full bg-gradient-to-b ${isFirst ? "from-yellow-400 to-yellow-600 scale-125" :
                                    isSecond ? "from-slate-300 to-slate-500" :
                                        "from-amber-600 to-amber-800"
                                } shadow-xl`}>
                                <Avatar className={`border-2 border-background ${isFirst ? "w-20 h-20" : "w-16 h-16"
                                    }`}>
                                    <AvatarImage src={student.avatar} alt={student.studentName} />
                                    <AvatarFallback className="text-xl font-bold">{student.studentName.charAt(0)}</AvatarFallback>
                                </Avatar>

                                {/* Rank Badge */}
                                <div className={`absolute -bottom-2 left-1/2 -translate-x-1/2 flex items-center justify-center w-8 h-8 rounded-full border-2 border-background font-bold text-white shadow-lg ${isFirst ? "bg-yellow-500" :
                                        isSecond ? "bg-slate-400" :
                                            "bg-amber-700"
                                    }`}>
                                    {student.rank}
                                </div>
                            </div>
                        </div>

                        {/* Student Info */}
                        <div className="text-center w-32">
                            <p className={`font-bold truncate px-2 ${isFirst ? "text-lg" : "text-sm text-muted-foreground"}`}>
                                {student.studentName}
                            </p>
                            <div className="flex flex-col items-center">
                                <span className={`font-black ${isFirst ? "text-2xl text-primary" : "text-lg text-primary/80"}`}>
                                    {student.points}
                                </span>
                                <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Points</span>
                            </div>

                            {student.streak > 0 && (
                                <div className="mt-1 inline-flex items-center gap-1 bg-orange-500/10 text-orange-600 px-2 py-0.5 rounded-full text-[10px] font-bold">
                                    <span>🔥 {student.streak} Day Streak</span>
                                </div>
                            )}
                        </div>

                        {/* Podium Base (Visual only) */}
                        <div className={`mt-4 w-full rounded-t-lg bg-gradient-to-b shadow-inner ${isFirst ? "h-32 from-yellow-500/20 to-yellow-500/5 border-t-2 border-yellow-500/30" :
                                isSecond ? "h-24 from-slate-400/20 to-slate-400/5 border-t-2 border-slate-400/30" :
                                    "h-16 from-amber-700/20 to-amber-700/5 border-t-2 border-amber-700/30"
                            }`}
                        />
                    </div>
                )
            })}
        </div>
    )
}
