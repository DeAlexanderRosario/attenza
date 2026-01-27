"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import type { User } from "./types"
import { useToast } from "@/hooks/use-toast"

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<string | null>
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()

  // On mount, check if user is already logged in by calling /api/auth/me
  useEffect(() => {
    async function checkSession() {
      try {
        const response = await fetch("/api/auth/me")
        if (response.ok) {
          const { user: foundUser } = await response.json()
          setUser(foundUser)
        }
      } catch (error) {
        console.error("Session check error:", error)
      } finally {
        setIsLoading(false)
      }
    }
    checkSession()
  }, [])

  /**
   * Secure Login: 
   * returns the user's role on success, or null on failure.
   * Opaque response from server - we fetch profile AFTER success.
   */
  const login = async (email: string, password: string): Promise<string | null> => {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })

      if (response.ok) {
        // Step 2: Fetch the full profile now that we are verified
        const meResponse = await fetch("/api/auth/me")
        if (meResponse.ok) {
          const { user: foundUser } = await meResponse.json()
          setUser(foundUser)
          toast({
            title: "Login Successful",
            description: `Welcome back, ${foundUser.name}!`,
          })
          return foundUser.role
        }
      } else {
        const errorData = await response.json()
        toast({
          title: "Login Failed",
          description: errorData.error || "Invalid credentials",
          variant: "destructive",
        })
      }
      return null
    } catch (error) {
      console.error("Critical login error:", error)
      toast({
        title: "Security Error",
        description: "Unable to establish a secure connection",
        variant: "destructive",
      })
      return null
    }
  }

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" })
    } catch (error) {
      console.error("Logout error:", error)
    }

    setUser(null)
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out",
    })
    // Force clean state
    window.location.href = "/login"
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
