"use client"

import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import type { LeaderboardEntry } from "@/lib/types"

interface LeaderboardListProps {
    entries: LeaderboardEntry[]
    currentUserId?: string
}

export function LeaderboardList({ entries, currentUserId }: LeaderboardListProps) {
    return (
        <div className="space-y-2 max-w-2xl mx-auto px-4">
            {entries.map((student) => {
                const isSelf = student.studentId === currentUserId

                return (
                    <Card
                        key={student.studentId}
                        className={`flex items-center p-3 transition-all duration-300 hover:translate-x-1 border-none shadow-none bg-transparent hover:bg-muted/50 ${isSelf ? "bg-primary/5 border-l-4 border-l-primary" : ""
                            }`}
                    >
                        {/* Rank Indicator */}
                        <div className="w-10 flex-none text-center">
                            <span className={`text-sm font-bold ${isSelf ? "text-primary" : "text-muted-foreground"}`}>
                                #{student.rank}
                            </span>
                        </div>

                        {/* Avatar */}
                        <Avatar className="w-10 h-10 border shadow-sm">
                            <AvatarImage src={student.avatar} alt={student.studentName} />
                            <AvatarFallback className="text-xs font-bold">{student.studentName.charAt(0)}</AvatarFallback>
                        </Avatar>

                        {/* Name & Details */}
                        <div className="flex-1 ml-4 flex items-center justify-between">
                            <div>
                                <h4 className={`font-semibold text-sm ${isSelf ? "text-primary" : "text-foreground"}`}>
                                    {student.studentName}
                                    {isSelf && <span className="ml-2 text-[10px] bg-primary/20 text-primary-foreground px-1.5 py-0.5 rounded font-black">YOU</span>}
                                </h4>
                                <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                                    <span className="flex items-center gap-1 font-medium">🔥 {student.streak} Day Streak</span>
                                    <span className="flex items-center gap-1 font-medium">🎯 {student.attendanceRate}% Atten.</span>
                                </div>
                            </div>

                            {/* Points & Rank Change */}
                            <div className="text-right flex items-center gap-4">
                                <div className="flex flex-col items-end">
                                    <span className="font-black text-primary text-base leading-none">{student.points}</span>
                                    <span className="text-[9px] uppercase tracking-tighter text-muted-foreground font-bold">Points</span>
                                </div>

                                {/* Visual Rank Change (Mocked if not provided) */}
                                <div className="w-4">
                                    {student.change && student.change > 0 ? (
                                        <TrendingUp className="w-3 h-3 text-success" />
                                    ) : student.change && student.change < 0 ? (
                                        <TrendingDown className="w-3 h-3 text-destructive" />
                                    ) : (
                                        <Minus className="w-3 h-3 text-muted-foreground opacity-20" />
                                    )}
                                </div>
                            </div>
                        </div>
                    </Card>
                )
            })}
        </div>
    )
}
