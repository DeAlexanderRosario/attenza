"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import type { User } from "./types"
import { useToast } from "@/hooks/use-toast"

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    const storedUser = localStorage.getItem("user")
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser))
      } catch (error) {
        console.error("[v0] Error parsing stored user:", error)
        localStorage.removeItem("user")
      }
    }
    setIsLoading(false)
  }, [])

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })

      if (response.ok) {
        const { user: foundUser } = await response.json()
        setUser(foundUser)
        localStorage.setItem("user", JSON.stringify(foundUser))
        toast({
          title: "Login Successful",
          description: `Welcome back, ${foundUser.name}!`,
        })
        return true
      } else {
        const errorData = await response.json()
        toast({
          title: "Login Failed",
          description: errorData.error || "Invalid credentials",
          variant: "destructive",
        })
      }
      return false
    } catch (error) {
      console.error("[v0] Login error:", error)
      toast({
        title: "Error",
        description: "Unable to connect to the server",
        variant: "destructive",
      })
      return false
    }
  }

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" })
    } catch (error) {
      console.error("Logout error:", error)
    }

    setUser(null)
    localStorage.removeItem("user")
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out",
    })
    window.location.href = "/login"
  }

  return <AuthContext.Provider value={{ user, login, logout, isLoading }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
