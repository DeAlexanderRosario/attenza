"use client"

import {
    SquareTerminal,
    LayoutDashboard,
    CalendarDays,
    Users,
    ClipboardCheck,
    BarChart3,
    Settings,
    LogOut,
    BookOpen,
} from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { useRouter, usePathname } from "next/navigation"
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
} from "@/components/ui/sidebar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Link from "next/link"

export function TeacherSidebar() {
    const { user, logout, isLoading } = useAuth()
    const router = useRouter()
    const pathname = usePathname()

    const handleLogout = () => {
        logout()
        router.push("/login")
    }

    // Teacher Navigation Items
    const navItems = [
        {
            title: "Dashboard",
            url: "/dashboard/teacher",
            icon: LayoutDashboard,
        },
        {
            title: "My Schedule",
            url: "/dashboard/teacher/schedule",
            icon: CalendarDays,
        },
        {
            title: "My Students",
            url: "/dashboard/teacher/students",
            icon: Users,
        },
        {
            title: "Attendance Reports",
            url: "/dashboard/teacher/reports",
            icon: BarChart3,
        },
        {
            title: "Settings",
            url: "/dashboard/teacher/settings",
            icon: Settings,
        },
    ]

    if (isLoading) {
        return (
            <Sidebar variant="inset" collapsible="icon" className="border-r border-white/5 bg-background/50 backdrop-blur-md">
                <SidebarHeader>
                    <div className="h-12 w-full animate-pulse bg-white/5 rounded-lg" />
                </SidebarHeader>
                <SidebarContent>
                    <div className="space-y-2 p-2">
                        {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className="h-10 w-full animate-pulse bg-white/5 rounded-lg" />
                        ))}
                    </div>
                </SidebarContent>
            </Sidebar>
        )
    }

    if (!user) return null

    return (
        <Sidebar variant="inset" collapsible="icon" className="border-r border-white/5 bg-background/50 backdrop-blur-md">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild className="hover:bg-primary/20 hover:text-primary transition-all duration-300 group">
                            <Link href="/dashboard/teacher">
                                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                                    <SquareTerminal className="size-4" />
                                </div>
                                <div className="grid flex-1 text-left text-sm leading-tight">
                                    <span className="truncate font-semibold">TrueCheck Teacher</span>
                                    <span className="truncate text-xs">Faculty Workspace</span>
                                </div>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel className="text-xs font-bold tracking-widest text-muted-foreground/70 uppercase px-4 py-2">Navigation</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {navItems.map((item) => (
                                <SidebarMenuItem key={item.title}>
                                    <SidebarMenuButton
                                        asChild
                                        tooltip={item.title}
                                        isActive={pathname === item.url}
                                        className="data-[active=true]:bg-primary/10 data-[active=true]:text-primary data-[active=true]:border-r-2 data-[active=true]:border-primary hover:bg-white/5 transition-all duration-200"
                                    >
                                        <Link href={item.url} className="flex items-center gap-3">
                                            <item.icon className="size-4" />
                                            <span className="font-medium">{item.title}</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>

            <SidebarFooter>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <SidebarMenuButton
                                    size="lg"
                                    className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground hover:bg-white/5"
                                >
                                    <Avatar className="h-8 w-8 rounded-lg border border-white/10">
                                        <AvatarImage src={user.avatar} alt={user.name} />
                                        <AvatarFallback className="rounded-lg bg-primary/20 text-primary">
                                            {user.name?.charAt(0).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="grid flex-1 text-left text-sm leading-tight">
                                        <span className="truncate font-semibold">{user.name}</span>
                                        <span className="truncate text-xs text-muted-foreground">{user.role}</span>
                                    </div>
                                    <LogOut className="ml-auto size-4 opacity-50 hover:opacity-100 hover:text-destructive transition-opacity" />
                                </SidebarMenuButton>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg bg-background/80 backdrop-blur-xl border border-white/10"
                                side="bottom"
                                align="end"
                                sideOffset={4}
                            >
                                <DropdownMenuItem onClick={handleLogout} className="focus:bg-destructive/20 focus:text-destructive">
                                    <LogOut className="mr-2 h-4 w-4" />
                                    Log out
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
            <SidebarRail />
        </Sidebar >
    )
}
