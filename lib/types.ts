export type UserRole = "student" | "teacher" | "admin" | "super_admin"
export type Teacher = User

export interface Organization {
  id: string
  name: string
  holidays: string[]
  minAttendancePercent: number
  breakRules: {
    durationMinutes: number
    maxBreaksPerDay: number
  }
}

export interface Department {
  id: string
  name: string
  code: string
  description?: string
  organizationId: string // Link to organization
  hodId?: string
  createdAt: Date
}

export interface Class {
  id: string
  name: string                    // e.g., "1st Year CS-A"
  departmentId: string            // Reference to department (UUID)
  departmentCode: string          // Keep for legacy/display convenience if needed
  year: number                    // 1, 2, 3, 4
  section?: string                // A, B, C (optional)
  classTutorId?: string           // Teacher ID
  roomNumber?: string             // e.g., "CS-101"
  location?: string               // Building/Floor
  capacity: number                // Max students
  organizationId: string          // Link to organization
  timetable?: ClassTimetableEntry[]  // Class-specific timetable mappings
  createdAt: Date
}

// Timetable entry stored within a class document
export interface ClassTimetableEntry {
  id: string
  classSlotId: string      // References college_slots.id
  dayOfWeek: string        // Monday, Tuesday, etc.
  subjectId?: string
  subjectName: string
  subjectCode: string
  teacherId: string
  actualTeacherId?: string // Who actually taught (from RFID)
  room?: string
  status?: "Scheduled" | "Ongoing" | "Completed" | "Cancelled"
}

export interface ClassStats {
  totalStudents: number
  maleStudents: number
  femaleStudents: number
  attendanceRate: number
  defaulters: number
}

export interface Address {
  doorNo?: string
  street?: string
  area?: string
  city?: string
  state?: string
  pincode?: string
}

export interface ParentDetails {
  fatherName?: string
  motherName?: string
  parentPhone?: string
  parentWhatsApp?: string
  parentEmail?: string
}

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  rfidTag?: string
  mobileAuth?: string
  organizationId: string
  password?: string
  resetToken?: string
  resetTokenExpiry?: Date

  // Student References
  departmentId?: string
  classId?: string

  // Legacy/Display fields (can be kept or phased out)
  department?: string

  // Teacher specific
  teachingDepartments?: string[]   // departments the teacher can teach (IDs)

  year?: number
  semester?: number
  points: number
  attendanceHistory?: AttendanceRecord[]
  avatar?: string
  createdAt: Date

  // Staff/Teacher specific fields
  phoneNumber?: string
  address?: string | Address // Supports simple string or structured object
  aadharNumber?: string
  employeeId?: string
  qualification?: string
  dateOfJoining?: Date
  gender?: "male" | "female" | "other" | "Male" | "Female" // Normalized case
  dateOfBirth?: Date
  emergencyContact?: string
  bloodGroup?: string

  // Student specific fields
  rollNumber?: string
  registerNumber?: string
  parent?: ParentDetails
}

// Time slot configuration (college-wide - same for all classes)
export interface ClassSlot {
  id: string
  slotNumber: number
  startTime: string    // "08:00"
  endTime: string      // "09:00"
  duration: number     // in minutes
  type: "CLASS" | "BREAK" | "LUNCH" | "FREE"
  isActive: boolean
  organizationId: string
  createdAt: Date
  updatedAt?: Date
}

// Timetable entry (what happens in each slot)
export interface TimetableEntry {
  id: string
  classId: string
  classSlotId: string  // Links to ClassSlot
  dayOfWeek: string
  subjectId?: string
  subjectName: string
  subjectCode: string
  teacherId: string
  actualTeacherId?: string  // Who actually taught (RFID)
  room?: string
  status: "Scheduled" | "Ongoing" | "Completed" | "Cancelled"
  isActive: boolean
  organizationId: string
  createdAt: Date
}

// Slot interface (Updated to match user schema)
export interface Slot {
  id: string
  name: string
  courseCode: string
  courseName: string
  teacherId: string
  actualTeacherId?: string
  currentTeacherId?: string
  currentSubject?: string

  classId?: string
  departmentId?: string

  day: string
  startTime: string
  endTime: string
  room: string

  // Display/Legacy
  department: string
  year: number
  semester: number

  isLastSlot: boolean
  isActive: boolean
  status?: "Scheduled" | "Conducted" | "Late" | "Cancelled"

  organizationId?: string
}

export interface AttendanceRecord {
  id: string
  studentId: string
  slotId: string
  rfidTag: string
  timestamp: Date
  status: "present" | "late" | "absent"
  deviceId?: string
  pointsEarned: number
  organizationId?: string
}

export interface LeaderboardEntry {
  rank: number
  studentId: string
  studentName: string
  points: number
  attendanceRate: number
  streak: number
  avatar?: string
  change?: number // Rank change (+1, -2, etc)
}

export type NotificationType = "attendance" | "achievement" | "alert" | "reminder" | "late_arrival" | "absent_alert"

export interface Notification {
  id: string
  userId: string
  type: NotificationType
  title: string
  message: string
  read: boolean
  timestamp: Date
  metadata?: Record<string, unknown>
  organizationId?: string
}

export interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  points: number
  condition: string
  unlockedAt?: Date
  organizationId?: string
}

export interface DailyGamification {
  date: string
  studentId: string
  todaysPoints: number
  wordOfTheDay?: {
    word: string
    hint: string
    isSolved: boolean
  }
}

// Subject/Course Management
export type SubjectType = "common" | "unique" // Common = shared across depts, Unique = dept-specific

export interface Subject {
  id: string
  name: string
  code: string
  description?: string
  credits: number
  type: SubjectType // "common" or "unique"
  organizationId: string
  createdAt: Date
}

// Many-to-Many: Subject can be in multiple departments
export interface SubjectDepartmentMapping {
  id: string
  subjectId: string
  departmentCode: string
  departmentId?: string
  semester: number // Which semester this subject is offered in this dept
  isElective: boolean
  organizationId?: string
  createdAt: Date
}

// Many-to-Many: Teacher can teach multiple subjects, across multiple departments
export interface TeacherSubjectMapping {
  id: string
  teacherId: string
  subjectId: string
  departmentCode: string
  departmentId?: string
  semester: number
  assignedAt: Date
  organizationId?: string
}

export interface Device {
  id: string
  deviceId: string // Hardware UID
  name: string
  type: "rfid_reader" | "display_board" | "biometric"
  room: string     // Linked Classroom
  placement: "inside" | "outside"
  classId?: string // Associated Class ID
  ipAddress?: string
  status: "online" | "offline" | "maintenance"
  lastSeen: Date
  config?: {
    readerMode: "check-in" | "check-out" | "both"
    volume: number
  }
  organizationId?: string
}
