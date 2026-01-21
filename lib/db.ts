import { getDatabase } from "@/lib/mongodb"

export async function getDB() {
    return await getDatabase()
}
