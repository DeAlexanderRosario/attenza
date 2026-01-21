"use client"

import { useEffect, useState } from "react"

export function DateTimeDisplay() {
    const [mounted, setMounted] = useState(false)
    const [date, setDate] = useState<Date | null>(null)

    useEffect(() => {
        setMounted(true)
        setDate(new Date())
        const timer = setInterval(() => setDate(new Date()), 1000)
        return () => clearInterval(timer)
    }, [])

    if (!mounted || !date) return <div className="h-10 w-32 animate-pulse bg-muted rounded-md" />

    return (
        <div className="flex flex-col items-end leading-tight mr-4">
            <div className="text-sm font-bold text-foreground">
                {date.toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true
                })}
            </div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                {date.toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric"
                })}
            </div>
        </div>
    )
}
