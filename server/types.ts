// ============================================================================
// SYSTEM MODES - Only ONE active at a time globally
// ============================================================================
export enum SystemMode {
    IDLE = "IDLE",                                        // Operating hours, no active slot
    EARLY_ACCESS_FIRST_SLOT = "EARLY_ACCESS_FIRST_SLOT",  // 30 min before first slot
    SLOT_ACTIVE = "SLOT_ACTIVE",                          // During active class window
    BREAK = "BREAK",                                      // Break period
    POST_CLASS_FREE_ACCESS = "POST_CLASS_FREE_ACCESS",    // After last slot ends
    CLOSED = "CLOSED"                                     // Outside operating hours
}

// ============================================================================
// ATTENDANCE STATES - Per-slot status
// ============================================================================
export enum AttendanceState {
    IDLE = "IDLE",
    WAITING_FOR_TEACHER = "WAITING_FOR_TEACHER",
    SLOT_ACTIVE = "SLOT_ACTIVE",
    BREAK = "BREAK",
    RE_VERIFICATION = "RE_VERIFICATION",
    SLOT_UPCOMING = "SLOT_UPCOMING",
    SLOT_CLOSED = "SLOT_CLOSED",
    SLOT_CANCELLED = "SLOT_CANCELLED"
}

// ============================================================================
// IN-ROOM STATUS - Separate from attendance
// ============================================================================
export type InRoomStatus = "IN" | "OUT" | "UNKNOWN";

// ============================================================================
// ATTENDANCE SOURCE - How attendance was created
// ============================================================================
export type AttendanceSource = "teacher_arrival" | "late_entry" | "manual_override" | "auto_re_verification";

// ============================================================================
// TIME SLOT CONFIGURATION
// ============================================================================
export interface TimeSlotConfig {
    id: number | string;
    startTime: string; // "09:00"
    endTime: string; // "10:00"
    label?: string;
    type: "class" | "break";
    slotNumber?: number;
    isActive?: boolean;
}

// ============================================================================
// ACTIVE SLOT - Runtime slot state
// ============================================================================
export interface ActiveSlot {
    id: string;
    slotId: string;
    sessionId?: string;

    // Slot details
    subjectName: string;
    subjectCode?: string;
    teacherId: string;
    room: string;
    classId?: string;
    organizationId?: string;

    // State
    status: AttendanceState;
    startTime: Date;
    endTime: Date;

    // Override tracking
    isOverridden: boolean;
    actualTeacherId?: string;

    // Timing
    teacherArrivedAt?: Date;
    reVerificationUntil?: Date;
    warningTriggered?: boolean;

    // Callbacks
    onReVerification?: (room: string, message?: string) => void;
}

// ============================================================================
// ATTENDANCE SNAPSHOT - For attendance poller
// ============================================================================
export interface AttendanceSnapshot {
    slotId: string;
    classId: string;
    timestamp: Date;
    insideStudents: Array<{
        studentId: string;
        name: string;
        rfidTag?: string;
    }>;
    outsideStudents: Array<{
        studentId: string;
        name: string;
        phoneNumber?: string;
    }>;
}

// ============================================================================
// BREAK RE-VERIFICATION
// ============================================================================
export interface BreakReVerification {
    studentId: string;
    currentSlotId: string;
    nextSlotId: string;
    reVerifiedAt: Date;
    room: string;
}

// ============================================================================
// MODE TRANSITION EVENT
// ============================================================================
export interface ModeTransitionEvent {
    fromMode: SystemMode;
    toMode: SystemMode;
    timestamp: Date;
    reason: string;
    triggeredBy?: string; // "auto" | "teacher_arrival" | "manual"
}

// ============================================================================
// PENDING ATTENDANCE
// ============================================================================
export interface PendingAttendance {
    rfidTag: string;
    timestamp: Date;
    deviceId: string;
}

// ============================================================================
// IN-ROOM STATUS RECORD
// ============================================================================
export interface InRoomStatusRecord {
    studentId: string;
    room: string;
    status: InRoomStatus;
    lastUpdated: Date;
    slotId?: string;
}

// ============================================================================
// ATTENDANCE RECORD (Database Schema)
// ============================================================================
export interface AttendanceRecord {
    id: string;
    studentId: string;
    slotId: string;
    rfidTag?: string;
    timestamp: Date;
    date: string; // YYYY-MM-DD
    status: "present" | "late" | "absent";
    deviceId: string;
    pointsEarned: number;
    subjectCode?: string;
    subjectName: string;
    teacherId: string;
    organizationId?: string;

    // New fields
    source: AttendanceSource;
    isVerified: boolean;
    verifiedAt?: Date;
    inRoomStatus: InRoomStatus;
    lastMovementAt?: Date;
}
