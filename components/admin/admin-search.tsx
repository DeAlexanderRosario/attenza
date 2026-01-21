"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Calculator, Calendar, CreditCard, Settings, Smile, User, Search } from "lucide-react"

import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
    CommandShortcut,
} from "@/components/ui/command"
import { Button } from "@/components/ui/button"

export function AdminSearch() {
    const [open, setOpen] = React.useState(false)
    const [query, setQuery] = React.useState("")
    const [loading, setLoading] = React.useState(false)
    const [results, setResults] = React.useState<{
        students: any[], departments: any[], courses: any[]
    }>({ students: [], departments: [], courses: [] })

    const router = useRouter()

    React.useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                setOpen((open) => !open)
            }
        }

        document.addEventListener("keydown", down)
        return () => document.removeEventListener("keydown", down)
    }, [])

    React.useEffect(() => {
        if (!open) return

        const delayDebounceFn = setTimeout(async () => {
            if (query.length < 2) {
                setResults({ students: [], departments: [], courses: [] })
                return
            }

            setLoading(true)
            try {
                // Dynamic import to avoid build time issues if server action not fully standard in client comp in this setup
                const { globalSearch } = await import("@/app/actions/attendance")
                const data = await globalSearch(query)
                setResults(data)
            } catch (e) {
                console.error(e)
            } finally {
                setLoading(false)
            }
        }, 300)

        return () => clearTimeout(delayDebounceFn)
    }, [query, open])

    const handleSelect = (id: string, type: string) => {
        setOpen(false)
        if (type === "student") router.push(`/dashboard/admin/students/${id}`) // Will need this page
        if (type === "department") router.push(`/dashboard/admin/departments/${id}`)
        // if (type === "subject") router.push(`/dashboard/admin/subjects/${id}`)
    }

    return (
        <>
            <Button
                variant="outline"
                className="relative h-9 w-full justify-start rounded-[0.5rem] bg-background text-sm font-normal text-muted-foreground shadow-none sm:pr-12 md:w-64 lg:w-96"
                onClick={() => setOpen(true)}
            >
                <Search className="mr-2 h-4 w-4" />
                <span className="hidden lg:inline-flex">Search student, dept...</span>
                <span className="inline-flex lg:hidden">Search...</span>
                <kbd className="pointer-events-none absolute right-[0.4rem] top-[0.4rem] hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
                    <span className="text-xs">⌘</span>K
                </kbd>
            </Button>
            <CommandDialog open={open} onOpenChange={setOpen}>
                <CommandInput placeholder="Type a command or search..." onValueChange={setQuery} />
                <CommandList>
                    <CommandEmpty>{loading ? "Searching..." : "No results found."}</CommandEmpty>

                    {!loading && results.students.length > 0 && (
                        <CommandGroup heading="Students">
                            {results.students.map(s => (
                                <CommandItem key={s.id} onSelect={() => handleSelect(s.id, "student")}>
                                    <User className="mr-2 h-4 w-4" />
                                    <span>{s.name}</span>
                                    <span className="ml-2 text-xs text-muted-foreground">({s.detail})</span>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    )}

                    {!loading && results.departments.length > 0 && (
                        <CommandGroup heading="Departments">
                            {results.departments.map(d => (
                                <CommandItem key={d.id} onSelect={() => handleSelect(d.id, "department")}>
                                    <Settings className="mr-2 h-4 w-4" />
                                    <span>{d.name}</span>
                                    <span className="ml-2 text-xs text-muted-foreground">{d.detail}</span>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    )}

                    {!loading && results.courses.length > 0 && (
                        <CommandGroup heading="Subjects">
                            {results.courses.map(c => (
                                <CommandItem key={c.id} onSelect={() => handleSelect(c.id, "subject")}>
                                    <Calculator className="mr-2 h-4 w-4" />
                                    <span>{c.name}</span>
                                    <span className="ml-2 text-xs text-muted-foreground">{c.detail}</span>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    )}

                    <CommandSeparator />
                    <CommandGroup heading="System">
                        <CommandItem>
                            <CreditCard className="mr-2 h-4 w-4" />
                            <span>Billing</span>
                        </CommandItem>
                    </CommandGroup>
                </CommandList>
            </CommandDialog>
        </>
    )
}
