"use server"

import { getDB } from "@/lib/db"
import { getSessionOrganizationId } from "@/lib/session"
import { revalidatePath } from "next/cache"

/**
 * Manually ends an active session in the database
 */
export async function endActiveSession(sessionId: string) {
    const db = await getDB()
    const orgId = await getSessionOrganizationId()

    // 1. Mark session as CLOSED
    const result = await db.collection("active_sessions").updateOne(
        { sessionId, organizationId: orgId },
        {
            $set: {
                status: "CLOSED",
                updatedAt: new Date()
            }
        }
    )

    if (result.matchedCount === 0) {
        return { success: false, error: "Session not found or already closed." }
    }

    // 2. Clear re-verification or other session-specific transient data if needed

    revalidatePath("/dashboard/teacher")
    return { success: true, message: "Session ended successfully." }
}

/**
 * Fetches the current active session for a teacher in a specific organization
 */
export async function getActiveTeacherSession(teacherId: string) {
    const db = await getDB()
    const orgId = await getSessionOrganizationId()

    const session = await db.collection("active_sessions").findOne({
        $or: [{ teacherId }, { actualTeacherId: teacherId }],
        status: { $in: ["WAITING_FOR_TEACHER", "ACTIVE"] },
        organizationId: orgId
    })

    if (!session) return null

    return {
        ...session,
        id: session.sessionId || session._id.toString()
    }
}
