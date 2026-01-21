"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { registerOrganization } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
    Building2,
    AlertCircle,
    ArrowLeft,
    User,
    Mail,
    Lock,
    ArrowRight,
    Loader2,
    GraduationCap,
    Users,
    Server
} from "lucide-react";
import Link from "next/link";
import { ModeToggle } from "@/components/mode-toggle";

export default function RegisterPage() {
    const [formData, setFormData] = useState({
        orgName: "",
        adminName: "",
        email: "",
        password: "",
    });

    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [mounted, setMounted] = useState(false);

    const router = useRouter();

    useEffect(() => {
        setMounted(true);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);

        try {
            const result = await registerOrganization(formData);
            if (result.success) {
                router.push("/dashboard/admin");
            } else {
                setError(result.error || "Registration failed. Please try again.");
            }
        } catch (err) {
            setError("An unexpected error occurred.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex bg-background text-foreground font-sans overflow-hidden selection:bg-primary/20">

            {/* ================= LEFT SIDE: FORM ================= */}
            <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 sm:px-12 lg:px-24 xl:px-32 relative z-10 border-r border-border">

                <div className="absolute top-6 right-6">
                    <ModeToggle />
                </div>

                <div className={`transition-all duration-700 delay-100 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                    <Link
                        href="/login"
                        className="group inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-10 text-sm font-medium"
                    >
                        <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                        <span>Back to Login</span>
                    </Link>

                    <div className="mb-8 space-y-2">
                        <h1 className="text-4xl font-bold tracking-tight text-foreground">
                            Create Organization
                        </h1>
                        <p className="text-muted-foreground text-lg text-balance">
                            Set up your institution's digital infrastructure in seconds.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {error && (
                            <Alert variant="destructive" className="animate-fade-in">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        {/* Org Name */}
                        <div className="space-y-2">
                            <Label htmlFor="orgName" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Organization Name
                            </Label>
                            <div className="relative group">
                                <Building2 className="absolute left-4 top-3.5 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                <Input
                                    id="orgName"
                                    placeholder="e.g. Springfield University"
                                    value={formData.orgName}
                                    onChange={(e) => setFormData({ ...formData, orgName: e.target.value })}
                                    required
                                    className="h-12 pl-12 bg-secondary/20 border-input hover:border-ring/50 focus:border-ring focus:ring-ring/20 transition-all placeholder:text-muted-foreground/50"
                                />
                            </div>
                        </div>

                        {/* Admin Name */}
                        <div className="space-y-2">
                            <Label htmlFor="adminName" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Administrator Name
                            </Label>
                            <div className="relative group">
                                <User className="absolute left-4 top-3.5 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                <Input
                                    id="adminName"
                                    placeholder="e.g. John Doe"
                                    value={formData.adminName}
                                    onChange={(e) => setFormData({ ...formData, adminName: e.target.value })}
                                    required
                                    className="h-12 pl-12 bg-secondary/20 border-input hover:border-ring/50 focus:border-ring focus:ring-ring/20 transition-all placeholder:text-muted-foreground/50"
                                />
                            </div>
                        </div>

                        {/* Split Grid for Email/Pass */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    Work Email
                                </Label>
                                <div className="relative group">
                                    <Mail className="absolute left-4 top-3.5 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="admin@edu.com"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        required
                                        className="h-12 pl-12 bg-secondary/20 border-input hover:border-ring/50 focus:border-ring focus:ring-ring/20 transition-all placeholder:text-muted-foreground/50"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    Password
                                </Label>
                                <div className="relative group">
                                    <Lock className="absolute left-4 top-3.5 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                    <Input
                                        id="password"
                                        type="password"
                                        placeholder="••••••••"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        required
                                        className="h-12 pl-12 bg-secondary/20 border-input hover:border-ring/50 focus:border-ring focus:ring-ring/20 transition-all placeholder:text-muted-foreground/50"
                                    />
                                </div>
                            </div>
                        </div>

                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="w-full h-12 mt-4 text-base font-medium shadow-md transition-all active:scale-[0.98]"
                        >
                            {isLoading ? (
                                <div className="flex items-center gap-2">
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                    <span>Creating Account...</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    Launch Platform <ArrowRight className="h-4 w-4" />
                                </div>
                            )}
                        </Button>

                        <p className="text-xs text-muted-foreground text-center mt-6">
                            By clicking above, you agree to our <a href="#" className="underline underline-offset-4 hover:text-primary">Terms</a> and <a href="#" className="underline underline-offset-4 hover:text-primary">Privacy Policy</a>.
                        </p>
                    </form>
                </div>
            </div>

            {/* ================= RIGHT SIDE: 3D VISUALS ================= */}
            <div className="hidden lg:flex w-1/2 relative bg-secondary/30 items-center justify-center overflow-hidden">

                {/* Dynamic Background Effects */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-background to-background"></div>
                <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] animate-pulse"></div>

                {/* Grid Floor */}
                <div className="absolute inset-0 opacity-[0.4] dark:opacity-[0.2] bg-[linear-gradient(to_right,var(--color-border)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-border)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,#000_60%,transparent_100%)]"></div>

                {/* 3D Container */}
                <div className="relative w-[500px] h-[500px]" style={{ perspective: '1200px' }}>
                    <div className="relative w-full h-full animate-hover-3d preserve-3d" style={{ transformStyle: 'preserve-3d', transform: 'rotateX(20deg) rotateY(-20deg)' }}>

                        {/* CENTRAL HUB (Base) */}
                        <div
                            className="glass-card absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-2xl flex flex-col items-center justify-center gap-4 z-20"
                            style={{ transform: 'translateZ(0px)' }}
                        >
                            {/* Inner Glow */}
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent rounded-2xl"></div>

                            {/* Spinning Ring */}
                            <div className="absolute inset-0 m-auto w-48 h-48 border border-dashed border-primary/20 rounded-full animate-spin-slow pointer-events-none"></div>

                            <div className="w-16 h-16 bg-primary text-primary-foreground rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
                                <Building2 className="h-8 w-8" />
                            </div>
                            <div className="text-center">
                                <p className="text-foreground font-bold text-lg">HQ Core</p>
                                <div className="flex items-center gap-1.5 justify-center mt-1">
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                    </span>
                                    <p className="text-emerald-500 text-xs font-mono font-medium">ONLINE</p>
                                </div>
                            </div>
                        </div>

                        {/* FLOATING CARD 1: Students */}
                        <div
                            className="glass-card absolute top-0 right-10 w-48 p-4 rounded-xl flex items-center gap-3 animate-float-delayed"
                            style={{ transform: 'translateZ(60px)' }}
                        >
                            <div className="p-2 bg-blue-500/10 rounded-lg">
                                <GraduationCap className="h-5 w-5 text-blue-500" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Records</p>
                                <p className="text-sm font-bold text-foreground">Students</p>
                            </div>
                        </div>

                        {/* FLOATING CARD 2: Staff */}
                        <div
                            className="glass-card absolute bottom-10 left-0 w-48 p-4 rounded-xl flex items-center gap-3 animate-float"
                            style={{ transform: 'translateZ(40px)' }}
                        >
                            <div className="p-2 bg-orange-500/10 rounded-lg">
                                <Users className="h-5 w-5 text-orange-500" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Access</p>
                                <p className="text-sm font-bold text-foreground">Faculty</p>
                            </div>
                        </div>

                        {/* FLOATING CARD 3: Server Status */}
                        <div
                            className="glass-card absolute -top-10 left-10 w-40 p-3 rounded-lg flex items-center gap-3 animate-float-reverse"
                            style={{ transform: 'translateZ(80px)' }}
                        >
                            <Server className="h-4 w-4 text-emerald-500" />
                            <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
                                <div className="bg-emerald-500 h-full w-3/4 animate-pulse"></div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            {/* Animation Styles */}
            <style jsx>{`
                @keyframes float {
                  0%, 100% { transform: translateZ(40px) translateY(0px); }
                  50% { transform: translateZ(40px) translateY(-10px); }
                }
                @keyframes float-delayed {
                  0%, 100% { transform: translateZ(60px) translateY(0px); }
                  50% { transform: translateZ(60px) translateY(-15px); }
                }
                @keyframes float-reverse {
                  0%, 100% { transform: translateZ(80px) translateY(0px); }
                  50% { transform: translateZ(80px) translateY(10px); }
                }
                @keyframes hover-3d {
                  0%, 100% { transform: rotateX(20deg) rotateY(-20deg); }
                  50% { transform: rotateX(25deg) rotateY(-15deg); }
                }
                @keyframes spin-slow {
                  from { transform: rotate(0deg); }
                  to { transform: rotate(360deg); }
                }
                .animate-float { animation: float 6s ease-in-out infinite; }
                .animate-float-delayed { animation: float-delayed 7s ease-in-out infinite; }
                .animate-float-reverse { animation: float-reverse 8s ease-in-out infinite; }
                .animate-hover-3d { animation: hover-3d 10s ease-in-out infinite; }
                .animate-spin-slow { animation: spin-slow 20s linear infinite; }
                .preserve-3d { transform-style: preserve-3d; }
            `}</style>
        </div>
    );
}