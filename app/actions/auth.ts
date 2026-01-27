"use server"

import { cookies } from "next/headers"
import { getDB } from "@/lib/db"
import { User, Organization } from "@/lib/types"
import { sendPasswordResetEmail } from "@/lib/mailer"

export async function registerOrganization(data: {
    orgName: string
    adminName: string
    email: string
    password?: string
}) {
    const db = await getDB()
    const { orgName, adminName, email, password } = data

    // 1. Check if email already exists
    const existingUser = await db.collection("users").findOne({ email })
    if (existingUser) {
        return { success: false, error: "Email already registered." }
    }

    // 2. Create Organization
    const orgId = crypto.randomUUID()
    const newOrg: Organization = {
        id: orgId,
        name: orgName,
        holidays: [],
        minAttendancePercent: 75,
        breakRules: {
            durationMinutes: 15,
            maxBreaksPerDay: 2
        }
    }
    await db.collection("organizations").insertOne(newOrg)

    const { hashPassword } = await import("@/lib/auth-utils")

    // 3. Create Admin User
    const newAdmin: User = {
        id: crypto.randomUUID(),
        name: adminName,
        email: email,
        role: "admin",
        organizationId: orgId,
        points: 0,
        createdAt: new Date(),
        password: password ? hashPassword(password) : undefined
    }

    await db.collection("users").insertOne(newAdmin)

    // 4. Initialize Default Settings
    const defaultTimeSlots = [
        { id: 1, startTime: "09:00", endTime: "10:00", type: "class", label: "Period 1" },
        { id: 2, startTime: "10:00", endTime: "11:00", type: "class", label: "Period 2" },
        { id: 3, startTime: "11:00", endTime: "12:00", type: "class", label: "Period 3" },
        { id: 4, startTime: "12:00", endTime: "13:00", type: "class", label: "Period 4" },
        { id: "break", startTime: "13:00", endTime: "14:00", type: "break", label: "Lunch Break" },
        { id: 5, startTime: "14:00", endTime: "15:00", type: "class", label: "Period 5" },
        { id: 6, startTime: "15:00", endTime: "16:00", type: "class", label: "Period 6" },
        { id: 7, startTime: "16:00", endTime: "17:00", type: "class", label: "Period 7" },
    ]

    await db.collection("system_settings").insertOne({
        type: "time_slots",
        organizationId: orgId,
        slots: defaultTimeSlots,
        updatedAt: new Date()
    })

    // AUTO-LOGIN
    const cookieStore = await cookies()
    const oneWeek = 60 * 60 * 24 * 7 * 1000

    cookieStore.set("organizationId", orgId, {
        httpOnly: true,
        path: "/",
        sameSite: "strict",
        expires: Date.now() + oneWeek
    })

    cookieStore.set("user_session", JSON.stringify({ id: newAdmin.id, role: newAdmin.role, organizationId: orgId }), {
        httpOnly: true,
        path: "/",
        sameSite: "strict",
        expires: Date.now() + oneWeek
    })

    return { success: true, orgId }
}

export async function requestPasswordReset(email: string) {
    const db = await getDB()
    const user = await db.collection<User>("users").findOne({ email })

    if (!user) {
        // Return success even if not found to prevent enumeration
        return { success: true, message: "If account exists, reset link sent." }
    }

    // Generate Request Token
    const resetToken = crypto.randomUUID()
    const resetTokenExpiry = new Date(Date.now() + 3600000) // 1 hour

    await db.collection("users").updateOne(
        { email },
        { $set: { resetToken, resetTokenExpiry } }
    )

    // Send Email
    await sendPasswordResetEmail(email, resetToken)

    return { success: true, message: "Reset link sent." }
}

export async function resetPassword(token: string, newPassword: string) {
    const db = await getDB()
    const user = await db.collection<User>("users").findOne({
        resetToken: token,
        resetTokenExpiry: { $gt: new Date() } // Check expiry
    })

    if (!user) {
        return { success: false, message: "Invalid or expired token." }
    }

    const { hashPassword } = await import("@/lib/auth-utils")

    // Update Password and Clear Token
    await db.collection("users").updateOne(
        { resetToken: token },
        {
            $set: { password: hashPassword(newPassword) },
            $unset: { resetToken: "", resetTokenExpiry: "" }
        }
    )

    return { success: true, message: "Password updated successfully." }
}
