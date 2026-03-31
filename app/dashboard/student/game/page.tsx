"use client"

import { useState, useEffect } from "react"
import { getDailyQuestion, submitGameAnswer } from "@/app/actions/student"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { HelpCircle, Gamepad2, CheckCircle2, XCircle } from "lucide-react"
import { toast } from "sonner"

export default function GamePage() {
    const [question, setQuestion] = useState<{
        question: string;
        options: string[];
        hint: string;
    } | null>(null)
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
    const [status, setStatus] = useState<"idle" | "success" | "error" | "loading">("loading")

    useEffect(() => {
        const fetchQuestion = async () => {
            const q = await getDailyQuestion()
            if (q) {
                setQuestion(q)
                setStatus("idle")
            } else {
                toast.error("Failed to load today's challenge")
            }
        }
        fetchQuestion()
    }, [])

    const handleSelect = (index: number) => {
        if (status === "success") return
        setSelectedIndex(index)
    }

    const handleSubmit = async () => {
        if (selectedIndex === null) {
            toast.error("Please select an answer")
            return
        }

        const result = await submitGameAnswer(selectedIndex)

        if (result.success) {
            setStatus("success")
            toast.success(result.message)
        } else {
            setStatus("error")
            toast.error(result.message)
        }
    }

    if (status === "loading") {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="text-center space-y-2">
                <h1 className="text-3xl font-bold flex items-center justify-center gap-2">
                    <Gamepad2 className="w-8 h-8 text-primary" />
                    Daily Challenge
                </h1>
                <p className="text-muted-foreground">Select the correct answer to earn +50 Points!</p>
            </div>

            <Card className="relative overflow-hidden border-2 border-primary/20 max-w-xl mx-auto">
                <div className="absolute top-0 right-0 p-4 opacity-5">
                    <HelpCircle className="w-32 h-32" />
                </div>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-xl">
                        {status === "success" ? (
                            <CheckCircle2 className="w-6 h-6 text-green-500" />
                        ) : status === "error" ? (
                            <XCircle className="w-6 h-6 text-red-500" />
                        ) : (
                            <HelpCircle className="w-6 h-6 text-primary" />
                        )}
                        Question
                    </CardTitle>
                    <CardDescription className="text-lg font-medium text-foreground leading-relaxed">
                        {question?.question}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid gap-3">
                        {question?.options.map((option, index) => (
                            <Button
                                key={index}
                                variant={selectedIndex === index ? "default" : "outline"}
                                className={`justify-start h-auto py-4 px-6 text-left whitespace-normal border-2 transition-all ${
                                    selectedIndex === index
                                        ? "border-primary bg-primary/10 text-primary hover:bg-primary/20"
                                        : "hover:border-primary/50"
                                } ${
                                    status === "success" && index === selectedIndex ? "border-green-500 bg-green-50 text-green-700" : ""
                                }`}
                                onClick={() => handleSelect(index)}
                                disabled={status === "success"}
                            >
                                <div className="flex items-center gap-4 w-full">
                                    <span className="flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold">
                                        {String.fromCharCode(65 + index)}
                                    </span>
                                    <span className="flex-grow">{option}</span>
                                </div>
                            </Button>
                        ))}
                    </div>

                    <div className="pt-4 space-y-4">
                        {status === "error" && (
                            <p className="text-sm text-red-500 text-center flex items-center justify-center gap-2">
                                <HelpCircle className="w-4 h-4" />
                                Hint: {question?.hint}
                            </p>
                        )}
                        
                        <Button
                            className="w-full h-12 text-lg font-bold"
                            onClick={handleSubmit}
                            disabled={status === "success" || selectedIndex === null}
                        >
                            {status === "success" ? "Reward Earned! 🎊" : "Submit Answer"}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
