import { cookies } from "next/headers"

export async function getSessionOrganizationId(): Promise<string> {
    const cookieStore = await cookies()
    const orgId = cookieStore.get("organizationId")?.value
    if (!orgId) throw new Error("Unauthorized: No session found")
    return orgId
}

export async function getSessionUser(): Promise<{
    id: string,
    role: string,
    organizationId: string,
    departmentId?: string,
    classId?: string,
    points?: number,
    name?: string,
    avatar?: string
} | null> {
    const cookieStore = await cookies()
    const userCookie = cookieStore.get("user_session")?.value
    if (!userCookie) return null
    try {
        return JSON.parse(userCookie)
    } catch (e) {
        return null
    }
}
