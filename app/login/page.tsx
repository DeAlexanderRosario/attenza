"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ModeToggle } from "@/components/mode-toggle";
import {
  Scan,
  AlertCircle,
  ArrowRight,
  BarChart3,
  Loader2,
  QrCode,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  const router = useRouter();
  const { login } = useAuth();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const success = await login(email, password);
      if (success) router.push("/");
      else setError("Invalid credentials. Please try again.");
    } catch (err) {
      setError("Connection error. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-background text-foreground font-sans overflow-hidden transition-colors duration-300">

      {/* ================= LEFT SIDE: FORM ================= */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 sm:px-12 lg:px-24 xl:px-32 relative z-10 bg-background">

        {/* Helper to toggle theme */}
        <div className="absolute top-6 right-6">
          <ModeToggle />
        </div>

        <div className={`transition-all duration-700 delay-100 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <Link href="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-12 text-sm group">
            <div className="p-1 rounded bg-muted group-hover:bg-muted/80 border border-border transition-colors">
              <Scan className="h-4 w-4" />
            </div>
            <span>Back to Website</span>
          </Link>

          <div className="mb-8 space-y-2">
            <h1 className="text-4xl font-bold tracking-tight text-foreground">
              Welcome back
            </h1>
            <p className="text-muted-foreground">
              Enter your credentials to access the workspace.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <Alert variant="destructive" className="animate-in fade-in slide-in-from-top-2 border-destructive/50 bg-destructive/5 text-destructive-foreground">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Institutional Email
                </Label>
                <div className="relative group">
                  {/* Improved Input: White background on light mode for better contrast */}
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@university.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-12 bg-white dark:bg-muted/30 border-input text-foreground focus:border-primary focus:ring-1 focus:ring-primary transition-all pl-4 shadow-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Password
                  </Label>
                  <Link href="/forgot-password" className="text-xs text-primary hover:text-primary/80 hover:underline transition-colors">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative group">
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-12 bg-white dark:bg-muted/30 border-input text-foreground focus:border-primary focus:ring-1 focus:ring-primary transition-all pl-4 shadow-sm"
                  />
                </div>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg shadow-lg shadow-primary/20 transition-all duration-300 transform hover:-translate-y-0.5"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Authenticating...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  Sign In <ArrowRight className="h-4 w-4" />
                </div>
              )}
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link href="/register" className="text-primary hover:text-primary/80 hover:underline underline-offset-4 font-medium">
              Register Institution
            </Link>
          </p>
        </div>
      </div>

      {/* ================= RIGHT SIDE: 3D VISUALS ================= */}
      {/* 
        Key Fix: Changed light bg to 'bg-slate-100' for better contrast with the white card. 
        Dark mode uses 'bg-slate-950'.
      */}
      <div className="hidden lg:flex w-1/2 relative bg-slate-100 dark:bg-slate-950 overflow-hidden items-center justify-center transition-colors duration-300">

        {/* Background Gradients - Made stronger for light mode */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-indigo-200 via-slate-100 to-slate-100 dark:from-indigo-900/40 dark:via-slate-950 dark:to-slate-950 opacity-80 dark:opacity-100"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-purple-200 via-slate-100 to-slate-100 dark:from-purple-900/20 dark:via-slate-950 dark:to-slate-950 opacity-80 dark:opacity-100"></div>

        {/* Blobs - Increased opacity in light mode to be visible against white */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-500/10 dark:bg-indigo-500/20 rounded-full blur-[120px] mix-blend-multiply dark:mix-blend-screen"></div>
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-purple-500/10 dark:bg-purple-500/10 rounded-full blur-[120px] mix-blend-multiply dark:mix-blend-screen"></div>

        {/* Grid Pattern */}
        <div className="absolute inset-0 opacity-[0.05] dark:opacity-[0.05] bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px]"></div>

        {/* 3D Container */}
        <div
          className="relative w-[400px] h-[400px]"
          style={{ perspective: '1000px' }}
        >
          <div className="relative w-full h-full animate-float-slow preserve-3d" style={{ transformStyle: 'preserve-3d', transform: 'rotateY(-15deg) rotateX(10deg)' }}>

            {/* ELEMENT 1: The ID Card */}
            {/* 
                Fix: Added shadow-indigo-500/10 for light mode depth. 
                Bg is pure white on light mode, slate-900 on dark.
            */}
            <div
              className="absolute top-10 left-10 w-80 h-48 rounded-xl border border-white/50 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] dark:shadow-2xl flex gap-4 overflow-hidden z-20"
              style={{ transform: 'translateZ(50px)' }}
            >
              {/* Scan Line Animation */}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-indigo-500/10 dark:via-indigo-500/5 to-transparent h-[20%] w-full animate-scan pointer-events-none"></div>

              {/* ID Content */}
              <div className="w-24 h-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center relative overflow-hidden border-r border-slate-100 dark:border-slate-700">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5"></div>
                <Scan className="w-10 h-10 text-primary drop-shadow-sm" />
              </div>
              <div className="flex-1 flex flex-col justify-between py-4 pr-4">
                <div>
                  <div className="h-2 w-12 bg-primary rounded-full mb-3 shadow-sm"></div>
                  <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded mb-2"></div>
                  <div className="h-3 w-20 bg-slate-100 dark:bg-slate-800 rounded"></div>
                </div>
                <div className="flex items-end justify-between">
                  <QrCode className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                  <div className="flex gap-1.5 items-center bg-emerald-500/5 px-2 py-1 rounded-full border border-emerald-500/20">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span className="text-[10px] uppercase text-emerald-600 dark:text-emerald-500 font-bold tracking-wide">Active</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ELEMENT 2: Analytics Card (Back Layer) */}
            <div
              className="absolute bottom-10 -right-10 w-72 h-64 rounded-xl border border-white/50 dark:border-slate-700/50 bg-white/60 dark:bg-slate-800/80 backdrop-blur-md shadow-xl p-5 flex flex-col z-10"
              style={{ transform: 'translateZ(-20px) translateX(20px)' }}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-500">
                    <BarChart3 className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Attendance</span>
                </div>
                <span className="text-xs text-emerald-600 dark:text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full font-medium">+12%</span>
              </div>

              {/* Bars */}
              <div className="flex items-end justify-between flex-1 gap-2 pl-2 border-l border-slate-200 dark:border-slate-700">
                {[45, 70, 50, 85, 60].map((h, i) => (
                  <div key={i} className="w-full bg-slate-100 dark:bg-slate-700/50 rounded-t-sm relative group overflow-hidden" style={{ height: `${h}%` }}>
                    <div className="absolute inset-x-0 bottom-0 bg-primary h-full opacity-80 transition-all duration-500"></div>
                  </div>
                ))}
              </div>
            </div>

            {/* ELEMENT 3: Security Badge (Floating) */}
            <div
              className="absolute -top-4 -right-4 bg-white dark:bg-slate-800 border border-slate-100 dark:border-white/10 p-3 rounded-lg flex items-center gap-3 shadow-[0_10px_30px_-5px_rgba(0,0,0,0.1)] dark:shadow-xl animate-bounce-slow z-30"
              style={{ transform: 'translateZ(80px)' }}
            >
              <div className="bg-green-500/10 p-1.5 rounded-full">
                <ShieldCheck className="w-5 h-5 text-green-600 dark:text-green-500" />
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Verification</div>
                <div className="text-sm font-bold text-foreground leading-none mt-0.5">Passed</div>
              </div>
            </div>

          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes float-slow {
          0%, 100% { transform: rotateY(-15deg) rotateX(10deg) translateY(0px); }
          50% { transform: rotateY(-15deg) rotateX(10deg) translateY(-20px); }
        }
        @keyframes bounce-slow {
          0%, 100% { transform: translateZ(80px) translateY(0px); }
          50% { transform: translateZ(80px) translateY(-10px); }
        }
        @keyframes scan {
          0% { top: -20%; opacity: 0; }
          10% { opacity: 1; }
          100% { top: 120%; opacity: 0; }
        }
        .animate-float-slow { animation: float-slow 6s ease-in-out infinite; }
        .animate-bounce-slow { animation: bounce-slow 4s ease-in-out infinite; }
        .animate-scan { animation: scan 3s linear infinite; }
        .preserve-3d { transform-style: preserve-3d; }
      `}</style>
    </div>
  );
}