import { getDatabase } from "./mongodb"
import type { User, Slot, AttendanceRecord, LeaderboardEntry, Achievement, Notification } from "./types"
import { ObjectId } from "mongodb"

// Utility to sanitize user data for client-side (STRICT WHITELIST)
export function sanitizeUser(user: any) {
  if (!user) return null

  // Whitelist approach: only pick exact fields we need
  return {
    id: user.id || user._id?.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    points: user.points || 0,
    avatar: user.avatar,
    department: user.department,
    year: user.year,
    semester: user.semester,
    createdAt: user.createdAt
  }
}

// Database raw access (SERVER-SIDE ONLY - INTERNAL)
export async function getRawUserByEmail(email: string): Promise<User | null> {
  const db = await getDatabase()
  const user = await db.collection<User>("users").findOne({ email })
  if (!user) return null
  return { ...user, id: user.id || user._id?.toString() } as User
}

// User operations (Sanitized for API)
export async function getUsers(organizationId: string = "org-1") {
  const db = await getDatabase()
  const users = await db.collection<User>("users").find({ organizationId }).toArray()
  return users.map(sanitizeUser)
}

export async function getUserById(id: string) {
  const db = await getDatabase()
  const query: any = { $or: [{ id }] }

  // Only search by ObjectId if it's a valid 24-char hex string
  if (ObjectId.isValid(id)) {
    query.$or.push({ _id: new ObjectId(id) })
  }

  const user = await db.collection<User>("users").findOne(query)
  return sanitizeUser(user)
}

export async function getUserByEmail(email: string) {
  const user = await getRawUserByEmail(email)
  return sanitizeUser(user)
}

export async function createUser(userData: Omit<User, "id">) {
  const db = await getDatabase()
  const result = await db.collection("users").insertOne({
    ...userData,
    id: crypto.randomUUID(),
    createdAt: new Date(),
  })
  return sanitizeUser({ ...userData, id: result.insertedId.toString() })
}

// Slot operations
export async function getSlots(filters?: { departmentId?: string; year?: number; semester?: number; classId?: string }) {
  const db = await getDatabase()
  const query: any = { isActive: true }

  if (filters?.departmentId) query.departmentId = filters.departmentId
  if (filters?.classId) query.classId = filters.classId
  if (filters?.year) query.year = filters.year
  if (filters?.semester) query.semester = filters.semester

  // Backwards compat check (if old schema slots exist)
  if (filters?.departmentId && !query.departmentId) {
    // query.department = ... (Need to resolve code from ID first, messy. Better rely on new data)
  }

  const slots = await db.collection<Slot>("college_slots").find(query).toArray()
  return slots.map((s) => ({ ...s, id: s.id || s._id.toString() }))
}

export async function getSlotById(id: string) {
  const db = await getDatabase()
  const query: any = { $or: [{ id }] }

  if (ObjectId.isValid(id)) {
    query.$or.push({ _id: new ObjectId(id) })
  }

  const slot = await db.collection<Slot>("college_slots").findOne(query)
  if (!slot) return null
  return { ...slot, id: slot.id || slot._id.toString() }
}

export async function createSlot(slotData: Omit<Slot, "id">) {
  const db = await getDatabase()
  const result = await db.collection("college_slots").insertOne({
    ...slotData,
    id: crypto.randomUUID()
  })
  return { ...slotData, id: result.insertedId.toString() }
}

export async function updateSlot(id: string, updates: Partial<Slot>) {
  const db = await getDatabase()
  const query: any = { $or: [{ id }] }
  if (ObjectId.isValid(id)) {
    query.$or.push({ _id: new ObjectId(id) })
  }
  await db.collection("college_slots").updateOne(query, { $set: updates })
}

export async function deleteSlot(id: string) {
  const db = await getDatabase()
  const query: any = { $or: [{ id }] }
  if (ObjectId.isValid(id)) {
    query.$or.push({ _id: new ObjectId(id) })
  }
  await db.collection("college_slots").updateOne(query, { $set: { isActive: false } })
}

// Attendance operations
export async function getAttendanceRecords(filters?: {
  studentId?: string
  slotId?: string
  startDate?: Date
  endDate?: Date
}) {
  const db = await getDatabase()
  const query: any = {}

  if (filters?.studentId) query.studentId = filters.studentId
  if (filters?.slotId) query.slotId = filters.slotId
  if (filters?.startDate || filters?.endDate) {
    query.timestamp = {}
    if (filters.startDate) query.timestamp.$gte = filters.startDate
    if (filters.endDate) query.timestamp.$lte = filters.endDate
  }

  const records = await db.collection<AttendanceRecord>("attendance").find(query).sort({ timestamp: -1 }).toArray()
  return records.map((r) => ({ ...r, id: r.id || r._id.toString() }))
}

export async function createAttendanceRecord(recordData: Omit<AttendanceRecord, "id">) {
  const db = await getDatabase()
  const result = await db.collection("attendance").insertOne({
    ...recordData,
    id: crypto.randomUUID(),
    timestamp: new Date(),
  })

  // Update student points
  if (recordData.pointsEarned > 0) {
    await db.collection("users").updateOne(
      { id: recordData.studentId }, // Match exact ID
      { $inc: { points: recordData.pointsEarned } }
    )
  }

  return { ...recordData, id: result.insertedId.toString() }
}

// Leaderboard operations
export async function getLeaderboard(filters?: { departmentId?: string; classId?: string }, limit: number = 20) {
  const db = await getDatabase()
  const matchQuery: any = { role: "student" }

  if (filters?.departmentId) matchQuery.departmentId = filters.departmentId
  if (filters?.classId) matchQuery.classId = filters.classId

  const students = await db.collection<User>("users").find(matchQuery).sort({ points: -1 }).limit(limit).toArray()

  const leaderboard: LeaderboardEntry[] = []

  for (let i = 0; i < students.length; i++) {
    const student = students[i]
    // Simple Attendance Rate Calc
    const totalPresent = await db.collection("attendance").countDocuments({ studentId: student.id, status: { $in: ["present", "late"] } })
    const totalRequired = 50 // Placeholder: Ideally calculate total past slots for this student
    const attendanceRate = Math.min(100, Math.round((totalPresent / totalRequired) * 100))

    // Mock Streak
    const streak = Math.floor(Math.random() * 10)

    leaderboard.push({
      rank: i + 1,
      studentId: student.id || student._id.toString(),
      studentName: student.name,
      points: student.points || 0,
      attendanceRate: attendanceRate,
      streak,
      avatar: student.avatar,
    })
  }

  return leaderboard
}

// Achievement operations
export async function getAchievements() {
  const db = await getDatabase()
  const achievements = await db.collection<Achievement>("achievements").find({}).toArray()
  return achievements.map((a) => ({ ...a, id: a.id || a._id.toString() }))
}

// Notification operations
export async function getNotifications(userId: string, unreadOnly = false) {
  const db = await getDatabase()
  const query: any = { userId }
  if (unreadOnly) query.read = false

  const notifications = await db.collection<Notification>("notifications").find(query).sort({ timestamp: -1 }).toArray()
  return notifications.map((n) => ({ ...n, id: n.id || n._id.toString() }))
}

export async function createNotification(notificationData: Omit<Notification, "id">) {
  const db = await getDatabase()
  const result = await db.collection("notifications").insertOne({
    ...notificationData,
    id: crypto.randomUUID(),
    timestamp: new Date(),
  })
  return { ...notificationData, id: result.insertedId.toString() }
}

export async function markNotificationRead(id: string) {
  const db = await getDatabase()
  const query: any = { $or: [{ id }] }
  if (ObjectId.isValid(id)) {
    query.$or.push({ _id: new ObjectId(id) })
  }
  await db.collection("notifications").updateOne(query, { $set: { read: true } })
}
