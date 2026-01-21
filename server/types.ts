export enum AttendanceState {
    IDLE = "IDLE",
    WAITING_FOR_TEACHER = "WAITING_FOR_TEACHER",
    SLOT_ACTIVE = "SLOT_ACTIVE", // Teacher is here
    BREAK = "BREAK",
    SLOT_UPCOMING = "SLOT_UPCOMING", // Early check-in allowed
    SLOT_CLOSED = "SLOT_CLOSED",
    SLOT_CANCELLED = "SLOT_CANCELLED" // Teacher never came
}

export interface TimeSlotConfig {
    id: number | string
    startTime: string // "09:00"
    endTime: string // "10:00"
    label?: string
    type: "class" | "break"
}

export interface ActiveSlot {
    id: string; // The specific instance ID (maybe UUID)
    slotId: string; // The timetable slot ID
    sessionId?: string; // Linked Database Session ID

    // Theoretical details
    subjectName: string;
    subjectCode?: string; // Added for attendance tracking
    teacherId: string;
    room: string;
    classId?: string; // Links to the Class entity
    organizationId?: string; // Organization Context

    // Live State
    status: AttendanceState;
    startTime: Date;
    endTime: Date;

    // Override details (if Physics teacher took Math class)
    isOverridden: boolean;
    actualTeacherId?: string;

    // Tracking
    teacherArrivedAt?: Date;
}

export interface PendingAttendance {
    rfidTag: string;
    timestamp: Date;
    deviceId: string;
}
