import { type NextRequest, NextResponse } from "next/server"
import { getUsers, createUser } from "@/lib/db-helpers"

export async function GET() {
  try {
    const users = await getUsers()
    return NextResponse.json(users)
  } catch (error) {
    console.error("[v0] Get users error:", error)
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const userData = await request.json()
    const user = await createUser(userData)
    return NextResponse.json(user)
  } catch (error) {
    console.error("[v0] Create user error:", error)
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 })
  }
}
