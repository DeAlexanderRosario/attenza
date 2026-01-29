"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { LeaderboardPodium } from "./leaderboard-podium"
import { LeaderboardList } from "./leaderboard-list"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import type { LeaderboardEntry } from "@/lib/types"

interface LeaderboardContainerProps {
    currentUserId?: string
    initialData?: LeaderboardEntry[] // All-time default
    isCompact?: boolean
}

export function LeaderboardContainer({ currentUserId, initialData, isCompact = false }: LeaderboardContainerProps) {
    const [activeTab, setActiveTab] = useState("all-time")
    const [data, setData] = useState<LeaderboardEntry[]>(initialData || [])
    const [isLoading, setIsLoading] = useState(false)

    const fetchLeaderboard = async (type: string) => {
        try {
            setIsLoading(true)
            const endpoint = type === "daily" ? "/api/leaderboard/daily" : "/api/leaderboard"
            const res = await fetch(endpoint)
            const json = await res.json()
            setData(json || [])
        } catch (err) {
            console.error("Failed to fetch leaderboard", err)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        if (activeTab === "daily") {
            fetchLeaderboard("daily")
        } else {
            if (initialData && activeTab === "all-time") {
                setData(initialData)
            } else {
                fetchLeaderboard("all-time")
            }
        }
    }, [activeTab, initialData])

    const topThree = data.slice(0, 3)
    const others = data.slice(3)

    return (
        <Card className={`border-none shadow-none bg-transparent ${isCompact ? "p-0" : ""}`}>
            <CardContent className={isCompact ? "p-0" : "p-6"}>
                <Tabs defaultValue="all-time" className="w-full" onValueChange={setActiveTab}>
                    <div className="flex items-center justify-between mb-8">
                        {!isCompact && (
                            <div>
                                <h2 className="text-2xl font-black italic tracking-tighter uppercase text-primary">Hall of Fame</h2>
                                <p className="text-xs text-muted-foreground font-bold">Ranked by performance & attendance</p>
                            </div>
                        )}
                        <TabsList className="bg-muted/50 border h-9">
                            <TabsTrigger value="daily" className="text-xs font-bold uppercase tracking-wider px-4">Daily</TabsTrigger>
                            <TabsTrigger value="all-time" className="text-xs font-bold uppercase tracking-wider px-4">All Time</TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value={activeTab} className="mt-0">
                        {isLoading ? (
                            <div className="space-y-4">
                                <Skeleton className="h-48 w-full rounded-2xl" />
                                <Skeleton className="h-64 w-full rounded-2xl" />
                            </div>
                        ) : data.length === 0 ? (
                            <div className="text-center py-20 bg-muted/20 rounded-3xl border-2 border-dashed">
                                <p className="text-sm text-muted-foreground font-bold italic">No rankings found for this period yet.</p>
                            </div>
                        ) : (
                            <div className="space-y-8">
                                <LeaderboardPodium topThree={topThree} />
                                <div className="bg-background/80 backdrop-blur-sm rounded-[2rem] border-2 border-primary/10 py-6">
                                    <LeaderboardList entries={others} currentUserId={currentUserId} />
                                </div>
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    )
}
