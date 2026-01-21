"use client"

import { useState } from "react"
import { submitWordGuess } from "@/app/actions/student"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { HelpCircle, Gamepad2 } from "lucide-react"
import { toast } from "sonner"

export default function GamePage() {
    const [guess, setGuess] = useState("")
    const [status, setStatus] = useState<"idle" | "success" | "error">("idle")

    const handleGuess = async () => {
        if (!guess) return
        const result = await submitWordGuess(guess)

        if (result.success) {
            setStatus("success")
            toast.success(result.message)
        } else {
            setStatus("error")
            toast.error(result.message)
        }
    }

    return (
        <div className="space-y-6">
            <div className="text-center space-y-2">
                <h1 className="text-3xl font-bold flex items-center justify-center gap-2">
                    <Gamepad2 className="w-8 h-8 text-primary" />
                    Word of the Day
                </h1>
                <p className="text-muted-foreground">Solve the puzzle to earn +50 Points!</p>
            </div>

            <Card className="relative overflow-hidden border-2 border-primary/20 max-w-xl mx-auto">
                <div className="absolute top-0 right-0 p-4 opacity-5">
                    <HelpCircle className="w-32 h-32" />
                </div>
                <CardHeader>
                    <CardTitle>Hint</CardTitle>
                    <CardDescription className="text-lg font-medium text-foreground">
                        "A step-by-step procedure for calculations"
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex gap-2">
                        <Input
                            placeholder="Enter your guess..."
                            value={guess}
                            onChange={(e) => setGuess(e.target.value)}
                            className="text-center text-lg tracking-widest uppercase font-bold h-12"
                            disabled={status === "success"}
                        />
                    </div>
                    <Button
                        className="w-full h-12 text-lg"
                        onClick={handleGuess}
                        disabled={status === "success"}
                    >
                        {status === "success" ? "Solved! 🎉" : "Submit Guess"}
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
}
