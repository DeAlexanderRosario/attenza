"use server"

import { getDatabase } from "@/lib/mongodb"
import { revalidatePath } from "next/cache"

export interface SystemSettings {
    earlyAccessWindowMins: number;
    postClassFreeAccessHours: number;
    operatingStartHour: number;
    operatingEndHour: number;
    teacherGraceMins: number;
    studentFirstSlotWindowMins: number;
    studentRegularWindowMins: number;
    reVerificationGraceMins: number;
    breakWarningMins: number;
}

export async function getSystemSettings(): Promise<SystemSettings> {
    const db = await getDatabase()
    const settings = await db.collection("system_settings").findOne({ type: "global_config" })

    // Return defaults if not found
    const defaultSettings: SystemSettings = {
        earlyAccessWindowMins: 30,
        postClassFreeAccessHours: 2,
        operatingStartHour: 7,
        operatingEndHour: 18,
        teacherGraceMins: 15,
        studentFirstSlotWindowMins: 30,
        studentRegularWindowMins: 5,
        reVerificationGraceMins: 3,
        breakWarningMins: 3,
    }

    if (!settings) return defaultSettings

    const { _id, type, updatedAt, ...rest } = settings as any
    return { ...defaultSettings, ...rest }
}

export async function updateSystemSettings(updates: Partial<SystemSettings>) {
    try {
        const db = await getDatabase()
        await db.collection("system_settings").updateOne(
            { type: "global_config" },
            {
                $set: {
                    ...updates,
                    type: "global_config",
                    updatedAt: new Date()
                }
            },
            { upsert: true }
        )
        revalidatePath("/dashboard/admin/settings")
        return { success: true }
    } catch (error) {
        console.error("Failed to update system settings:", error)
        return { success: false, error: "Failed to update settings" }
    }
}
