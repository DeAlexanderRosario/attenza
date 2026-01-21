"use client"

import { useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { resetPassword } from "@/app/actions/auth"
import { Loader2, CheckCircle2, AlertCircle, KeyRound, ArrowRight } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"

function ResetPasswordForm() {
    const searchParams = useSearchParams()
    const token = searchParams.get("token")
    const router = useRouter()
    const { toast } = useToast()

    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [status, setStatus] = useState<"idle" | "success" | "error">("idle")

    if (!token) {
        return (
            <div className="text-center p-6 space-y-4 animate-in fade-in duration-500">
                <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center text-destructive">
                    <AlertCircle className="h-8 w-8" />
                </div>
                <h3 className="font-semibold text-lg">Invalid or Expired Link</h3>
                <p className="text-sm text-muted-foreground">This password reset link is invalid or has already been used.</p>
                <Button className="w-full mt-4" variant="outline" onClick={() => router.push("/forgot-password")}>
                    Request New Link
                </Button>
            </div>
        )
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (password !== confirmPassword) {
            toast({
                title: "Passwords do not match",
                description: "Please ensure both passwords are the same.",
                variant: "destructive"
            })
            return
        }

        setIsLoading(true)
        setStatus("idle")

        try {
            const result = await resetPassword(token, password)
            if (result.success) {
                setStatus("success")
                toast({
                    title: "Password Reset Successful",
                    description: "You can now log in with your new password.",
                    duration: 5000,
                })
                setTimeout(() => {
                    router.push("/login")
                }, 3000)
            } else {
                setStatus("error")
                toast({
                    title: "Reset Failed",
                    description: result.message || "Failed to reset password. Token may have expired.",
                    variant: "destructive"
                })
            }
        } catch (err) {
            setStatus("error")
            toast({
                title: "Error",
                description: "An unexpected error occurred. Please try again.",
                variant: "destructive"
            })
        } finally {
            setIsLoading(false)
        }
    }

    if (status === "success") {
        return (
            <div className="text-center py-6 space-y-6 animate-in zoom-in-95 duration-300">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary animate-bounce">
                    <CheckCircle2 className="h-8 w-8" />
                </div>
                <div className="space-y-2">
                    <h3 className="text-xl font-bold">All Set!</h3>
                    <p className="text-muted-foreground">Your password has been successfully updated.</p>
                </div>
                <Button className="w-full group" onClick={() => router.push("/login")}>
                    Go to Login <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
            </div>
        )
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-5 animate-in slide-in-from-right-4 duration-500">
            <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <Input
                    id="password"
                    type="password"
                    placeholder="Enter new password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="h-11"
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    className="h-11"
                />
            </div>

            <Button type="submit" className="w-full h-11" disabled={isLoading}>
                {isLoading ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Resetting...
                    </>
                ) : (
                    "Set New Password"
                )}
            </Button>
        </form>
    )
}

export default function ResetPasswordPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
            <Card className="w-full max-w-md shadow-xl border-t-4 border-t-primary">
                <CardHeader className="text-center space-y-2">
                    <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-2">
                        <KeyRound className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-2xl font-bold">Set New Password</CardTitle>
                    <CardDescription>
                        Create a strong password for your account.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Suspense fallback={<div className="flex justify-center p-8"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>}>
                        <ResetPasswordForm />
                    </Suspense>
                </CardContent>
                <CardFooter className="flex justify-center p-2 pb-6">
                    <Link href="/login" className="text-xs text-muted-foreground hover:text-primary transition-colors">
                        Back to Login
                    </Link>
                </CardFooter>
            </Card>
        </div>
    )
}
