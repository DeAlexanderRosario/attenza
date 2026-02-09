"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import {
  Sparkles,
  Menu,
  X,
  ArrowRight,
  Play,
  Shield,
  BarChart3,
  Building2,
  Fingerprint,
  Cloud,
  Users,
  CheckCircle2,
  Lock,
  Globe,
  Smartphone,
} from "lucide-react";
import { ModeToggle } from "@/components/mode-toggle";
import { useAuth } from "@/lib/auth-context";

export default function HomePage() {
  const { user } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Handle scroll effect for navbar
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground font-sans overflow-x-hidden selection:bg-primary/20 selection:text-primary">

      {/* ================= BACKGROUND EFFECTS ================= */}
      {/* ================= BACKGROUND EFFECTS ================= */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        {/* Light Mode: Subtle Warmth */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-background to-background dark:hidden -z-10"></div>
        {/* Dark Mode: Deep Space Glow (Subtle) */}
        <div className="absolute top-0 right-0 w-[800px] h-[600px] bg-primary/5 blur-[120px] rounded-full opacity-30 -z-10 dark:block hidden"></div>
      </div>

      {/* ================= NAVBAR ================= */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled
          ? "glass py-4 shadow-sm"
          : "bg-transparent py-6"
          }`}
      >
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 shadow-lg shadow-primary/20 group-hover:shadow-primary/40 transition-all">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight text-foreground">TrueCheck</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <a href="#features" className="hover:text-primary transition-colors">Product</a>
            <a href="#solutions" className="hover:text-primary transition-colors">Solutions</a>
            <a href="#pricing" className="hover:text-primary transition-colors">Pricing</a>
            <a href="#docs" className="hover:text-primary transition-colors">Docs</a>
          </div>

          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <Link
                href={user.role === "student" ? "/dashboard/student" : user.role === "teacher" ? "/dashboard/teacher" : "/dashboard/admin"}
                className="px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-all shadow-lg shadow-primary/20"
              >
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-all shadow-lg shadow-primary/20"
                >
                  Get Started
                </Link>
              </>
            )}
            <ModeToggle />
          </div>

          {/* Mobile Toggle */}
          <button
            className="md:hidden text-muted-foreground"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="absolute top-full left-0 right-0 bg-background/95 backdrop-blur-xl border-b border-border p-6 flex flex-col gap-4 shadow-2xl md:hidden animate-accordion-down">
            <a href="#features" onClick={() => setMobileMenuOpen(false)} className="text-lg font-medium text-foreground">Product</a>
            <a href="#solutions" onClick={() => setMobileMenuOpen(false)} className="text-lg font-medium text-foreground">Solutions</a>
            <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="text-lg font-medium text-foreground">Pricing</a>
            <hr className="border-border" />
            {user ? (
              <Link
                href={user.role === "student" ? "/dashboard/student" : user.role === "teacher" ? "/dashboard/teacher" : "/dashboard/admin"}
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-3 rounded-lg bg-primary text-primary-foreground font-semibold"
              >
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="text-lg font-medium text-muted-foreground">Sign In</Link>
                <Link href="/register" onClick={() => setMobileMenuOpen(false)} className="w-full text-center py-3 rounded-lg bg-primary text-primary-foreground font-semibold">
                  Get Started
                </Link>
              </>
            )}
            <div className="flex items-center justify-between mt-2">
              <span className="text-muted-foreground">Switch Theme</span>
              <ModeToggle />
            </div>
          </div>
        )}
      </nav>

      {/* ================= HERO SECTION ================= */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden z-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col items-center text-center">

          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium mb-8 animate-fade-in">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            v2.0 is now live — See what's new
          </div>

          {/* Headline */}
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 max-w-4xl text-foreground">
            The Operating System for <br className="hidden md:block" />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-violet-500">
              Future-Ready Campuses
            </span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-10 leading-relaxed text-balance">
            Unify attendance, security, compliance, and academics into a single, beautiful dashboard.
            Automate the boring stuff so you can focus on education.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto animate-slide-in-from-bottom">
            <Link
              href="/register"
              className="px-8 py-4 rounded-full bg-primary hover:opacity-90 text-primary-foreground font-semibold transition-all shadow-lg shadow-primary/25 flex items-center justify-center gap-2"
            >
              Start Free Trial <ArrowRight className="h-4 w-4" />
            </Link>
            <button className="px-8 py-4 rounded-full bg-secondary border border-border hover:bg-secondary/80 text-secondary-foreground font-semibold transition-all flex items-center justify-center gap-2">
              <Play className="h-4 w-4 fill-current" /> Watch Demo
            </button>
          </div>

          {/* Dashboard Preview Mockup */}
          <div className="relative mt-20 w-full max-w-5xl mx-auto perspective-1000">
            <div className="relative rounded-xl glass-card md:rotate-x-12 transform transition-transform duration-700 hover:rotate-0 overflow-hidden">
              {/* Fake Browser UI */}
              <div className="h-10 bg-muted/50 border-b border-border flex items-center px-4 gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50"></div>
                </div>
                <div className="mx-auto text-xs text-muted-foreground font-mono bg-background/50 px-3 py-1 rounded-md border border-border">
                  campus-os.admin.dashboard
                </div>
              </div>

              {/* Dashboard Content Mock */}
              <div className="bg-card/50 p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Left Col */}
                  <div className="space-y-6">
                    <DashboardCard title="Real-time Attendance" value="94.8%" trend="+2.4%" positive />
                    <DashboardCard title="Active Faculty" value="142" sub="On Campus" />
                  </div>
                  {/* Middle Col */}
                  <div className="md:col-span-2 bg-background/50 rounded-lg border border-border p-6 relative overflow-hidden">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="font-semibold text-foreground">Weekly Analytics</h3>
                      <BarChart3 className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex items-end justify-between gap-2 h-32">
                      {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
                        <div key={i} className="w-full bg-primary/20 hover:bg-primary transition-colors rounded-t-sm" style={{ height: `${h}%` }}></div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Glow Behind */}
              <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl blur opacity-10 -z-10"></div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= SOCIAL PROOF ================= */}
      <section className="py-10 border-y border-border bg-secondary/20">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-center text-sm font-bold tracking-widest text-muted-foreground mb-8">TRUSTED BY INNOVATIVE INSTITUTIONS</p>
          <div className="flex flex-wrap justify-center gap-12 md:gap-20 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
            {['TechUniversity', 'GlobalHigh', 'FutureAcademy', 'EduCorp', 'StateCollege'].map((brand) => (
              <span key={brand} className="text-xl font-bold text-foreground flex items-center gap-2">
                <Building2 className="h-6 w-6" /> {brand}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ================= BENTO GRID FEATURES ================= */}
      <section id="features" className="py-24 relative z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="mb-16 md:text-center max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">Everything you need to run a campus</h2>
            <p className="text-muted-foreground text-lg">
              Replace your fragmented spreadsheets and legacy software with one cohesive operating system.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            {/* Large Card 1 */}
            <div className="md:col-span-2 row-span-2 rounded-2xl bg-card border border-border p-8 relative overflow-hidden group shadow-sm hover:shadow-md transition-all">
              <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-10 transition-opacity">
                <Fingerprint className="w-64 h-64 text-primary" />
              </div>
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-6 text-primary">
                  <Fingerprint className="h-6 w-6" />
                </div>
                <h3 className="text-2xl font-bold mb-2 text-foreground">Biometric & Geo-Fencing</h3>
                <p className="text-muted-foreground mb-6 max-w-md">
                  Eliminate proxy attendance forever. Our system uses advanced geo-fencing and optional biometric integration to ensure students are actually where they say they are.
                </p>
                <ul className="space-y-3">
                  <ListItem text="GPS Radius Check" />
                  <ListItem text="Device Fingerprinting" />
                  <ListItem text="Live Location Logs" />
                </ul>
              </div>
            </div>

            {/* Tall Card */}
            <div className="md:col-span-1 row-span-2 rounded-2xl bg-card border border-border p-8 flex flex-col relative overflow-hidden shadow-sm">
              <div className="w-12 h-12 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-6 text-emerald-500">
                <Shield className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-foreground">Enterprise Security</h3>
              <p className="text-muted-foreground mb-auto">
                SOC-2 compliant infrastructure protecting sensitive student data with bank-grade encryption.
              </p>
              <div className="mt-8 space-y-4">
                <div className="p-3 bg-background rounded border border-border flex items-center gap-3">
                  <Lock className="h-4 w-4 text-emerald-500" />
                  <span className="text-xs text-muted-foreground">256-bit Encryption</span>
                </div>
                <div className="p-3 bg-background rounded border border-border flex items-center gap-3">
                  <Cloud className="h-4 w-4 text-emerald-500" />
                  <span className="text-xs text-muted-foreground">Daily Backups</span>
                </div>
              </div>
            </div>

            {/* Wide Card */}
            <div className="md:col-span-3 rounded-2xl bg-card border border-border p-8 flex flex-col md:flex-row items-center gap-8 group hover:border-violet-500/30 transition-colors shadow-sm">
              <div className="flex-1 space-y-4">
                <div className="w-12 h-12 rounded-lg bg-violet-500/10 flex items-center justify-center text-violet-500">
                  <BarChart3 className="h-6 w-6" />
                </div>
                <h3 className="text-2xl font-bold text-foreground">Predictive Analytics</h3>
                <p className="text-muted-foreground">
                  Don't just store data, use it. TrueCheck analyzes attendance trends to predict dropouts and flag at-risk students before it's too late.
                </p>
              </div>
              <div className="flex-1 w-full bg-background rounded-lg border border-border p-4">
                <div className="flex items-center justify-between mb-4 border-b border-border pb-2">
                  <span className="text-xs font-mono text-muted-foreground">RISK_REPORT.CSV</span>
                  <span className="text-xs text-red-500">High Priority</span>
                </div>
                <div className="space-y-2">
                  <div className="h-2 w-3/4 bg-secondary rounded"></div>
                  <div className="h-2 w-1/2 bg-secondary rounded"></div>
                  <div className="h-2 w-full bg-secondary rounded"></div>
                </div>
              </div>
            </div>

            {/* Small Cards */}
            <FeatureCard icon={Users} title="Role Management" desc="Granular permissions for Admins, Faculty, and Students." />
            <FeatureCard icon={Globe} title="Cloud Native" desc="Access from anywhere. No local servers to maintain." />
            <FeatureCard icon={Smartphone} title="Mobile First" desc="Dedicated apps for iOS and Android included." />

          </div>
        </div>
      </section>

      {/* ================= STATS SECTION ================= */}
      <section className="py-20 border-y border-border bg-secondary/30">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <StatBox value="500+" label="Institutions" />
          <StatBox value="2.5M" label="Daily Users" />
          <StatBox value="99.99%" label="Uptime SLA" />
          <StatBox value="24/7" label="Support" />
        </div>
      </section>

      {/* ================= CTA SECTION ================= */}
      <section className="py-32 relative overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute inset-0 bg-primary/5 -z-10"></div>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-primary/10 blur-[120px] rounded-full pointer-events-none"></div>

        <div className="max-w-4xl mx-auto px-6 text-center space-y-8">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">
            Ready to modernize your campus?
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Join 500+ forward-thinking institutions that have switched to TrueCheck.
            Setup takes less than 48 hours.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
            <Link
              href="/register"
              className="px-8 py-4 rounded-full bg-foreground text-background font-bold hover:opacity-90 transition-all transform hover:scale-105 shadow-xl"
            >
              Get Started for Free
            </Link>
            <button className="px-8 py-4 rounded-full border border-input text-foreground font-semibold hover:bg-secondary transition-all">
              Talk to Sales
            </button>
          </div>

          <p className="text-sm text-muted-foreground pt-4">
            No credit card required · 14-day free trial · Cancel anytime
          </p>
        </div>
      </section>

      {/* ================= FOOTER ================= */}
      <footer className="bg-background pt-20 pb-10 border-t border-border">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-10 mb-16">
            <div className="col-span-2">
              <Link href="/" className="flex items-center gap-2 mb-6">
                <div className="p-1.5 rounded bg-primary">
                  <Sparkles className="h-4 w-4 text-primary-foreground" />
                </div>
                <span className="font-bold text-xl text-foreground">TrueCheck</span>
              </Link>
              <p className="text-muted-foreground text-sm max-w-xs mb-6">
                The complete operating system for modern educational institutions.
                Designed in California, trusted globally.
              </p>
              <div className="flex gap-4">
                {/* Social placeholders */}
                <div className="w-8 h-8 rounded-full bg-secondary border border-border flex items-center justify-center hover:bg-primary/10 hover:text-primary cursor-pointer transition-colors"><Globe className="h-4 w-4 text-muted-foreground" /></div>
                <div className="w-8 h-8 rounded-full bg-secondary border border-border flex items-center justify-center hover:bg-primary/10 hover:text-primary cursor-pointer transition-colors"><Users className="h-4 w-4 text-muted-foreground" /></div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-6">Product</h4>
              <ul className="space-y-4 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-primary transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Integrations</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Changelog</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-6">Resources</h4>
              <ul className="space-y-4 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-primary transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">API Reference</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Community</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Help Center</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-6">Company</h4>
              <ul className="space-y-4 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-primary transition-colors">About</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Careers</a> <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full ml-2">Hiring</span></li>
                <li><a href="#" className="hover:text-primary transition-colors">Contact</a></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-muted-foreground text-sm">
              © {new Date().getFullYear()} CampusOS Inc. All rights reserved.
            </p>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-foreground transition-colors">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ================= COMPONENT HELPERS ================= */

function ListItem({ text }: { text: string }) {
  return (
    <li className="flex items-center gap-3 text-sm text-muted-foreground">
      <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
      {text}
    </li>
  );
}

function DashboardCard({ title, value, sub, trend, positive }: any) {
  return (
    <div className="bg-background rounded-lg border border-border p-4 hover:border-primary/20 transition-colors shadow-sm">
      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{title}</p>
      <div className="flex items-end justify-between">
        <h4 className="text-2xl font-bold text-foreground">{value}</h4>
        {trend && (
          <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${positive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
            {trend}
          </span>
        )}
        {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
      </div>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, desc }: any) {
  return (
    <div className="bg-card border border-border p-6 rounded-2xl transition-all shadow-sm hover:shadow-md">
      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="font-bold text-lg mb-2 text-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
    </div>
  );
}

function StatBox({ value, label }: { value: string; label: string }) {
  return (
    <div className="space-y-2">
      <h3 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-foreground to-muted-foreground">
        {value}
      </h3>
      <p className="text-muted-foreground font-medium">{label}</p>
    </div>
  );
}