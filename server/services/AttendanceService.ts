import { Collection, ObjectId } from "mongodb";
import { ActiveSlot, AttendanceState, AttendanceSource, InRoomStatus } from "../types";

export class AttendanceService {
    constructor(
        private attendanceCollection: Collection,
        private usersCollection: Collection,
        private inRoomStatusCollection: Collection
    ) { }

    /**
     * Create attendance from snapshot (called by AttendancePoller)
     */
    public async createAttendanceFromSnapshot(
        studentIds: string[],
        slot: ActiveSlot,
        timestamp: Date,
        source: AttendanceSource = "teacher_arrival"
    ): Promise<{ success: boolean; count: number; errors: string[] }> {
        const dateStr = timestamp.toLocaleDateString('en-CA');
        const errors: string[] = [];
        let successCount = 0;

        // Parallel execution for speed, but MongoDB handles atomic uniqueness via findAndModify/updateOne
        const promises = studentIds.map(async (studentId) => {
            try {
                const result = await this.attendanceCollection.updateOne(
                    { studentId, slotId: slot.slotId, date: dateStr },
                    {
                        $setOnInsert: {
                            id: new ObjectId().toString(),
                            studentId,
                            slotId: slot.slotId,
                            rfidTag: "AUTO_SNAPSHOT",
                            timestamp,
                            date: dateStr,
                            status: "present",
                            deviceId: "ATTENDANCE_POLLER",
                            pointsEarned: 10,
                            subjectCode: slot.subjectCode,
                            subjectName: slot.subjectName,
                            teacherId: slot.teacherId,
                            organizationId: slot.organizationId,
                            source,
                            isVerified: true,
                            verifiedAt: timestamp,
                            inRoomStatus: "IN",
                            lastMovementAt: timestamp
                        }
                    },
                    { upsert: true }
                );

                if (result.upsertedCount > 0) {
                    await this.usersCollection.updateOne({ id: studentId }, { $inc: { points: 10 } });
                    successCount++;
                }
            } catch (error) {
                errors.push(`Failed for ${studentId}: ${error}`);
            }
        });

        await Promise.all(promises);

        return { success: errors.length === 0, count: successCount, errors };
    }

    /**
     * Mark late entry (student arriving after entry window)
     */
    public async markLateEntry(
        student: { id: string; name: string },
        slot: ActiveSlot,
        timestamp: Date,
        deviceId: string,
        rfidTag: string
    ): Promise<{ success: boolean; message: string; points?: number }> {
        const dateStr = timestamp.toLocaleDateString('en-CA');

        // Calculate points (Atomic logic)
        const graceStart = slot.teacherArrivedAt || slot.startTime;
        const diffMins = (timestamp.getTime() - graceStart.getTime()) / 60000;
        const status = diffMins > 5 ? "late" : "present";
        const points = diffMins > 5 ? 5 : 10;

        try {
            const result = await this.attendanceCollection.updateOne(
                { studentId: student.id, slotId: slot.slotId, date: dateStr },
                {
                    $setOnInsert: {
                        id: new ObjectId().toString(),
                        studentId: student.id,
                        slotId: slot.slotId,
                        rfidTag,
                        timestamp,
                        date: dateStr,
                        status,
                        deviceId,
                        pointsEarned: points,
                        subjectCode: slot.subjectCode,
                        subjectName: slot.subjectName,
                        teacherId: slot.teacherId,
                        organizationId: slot.organizationId,
                        source: "late_entry",
                        isVerified: false,
                        inRoomStatus: "IN",
                        lastMovementAt: timestamp
                    }
                },
                { upsert: true }
            );

            if (result.upsertedCount > 0) {
                await this.usersCollection.updateOne({ id: student.id }, { $inc: { points } });
                return { success: true, message: `Marked ${status.toUpperCase()}`, points };
            } else {
                return { success: false, message: "Attendance already exists" };
            }
        } catch (error) {
            console.error(`[AttendanceService] Critical Failure marking late entry for ${student.id}:`, error);
            return { success: false, message: "Database error during marking" };
        }
    }

    /**
     * Update in-room status (for movement tracking)
     * This does NOT create attendance, only tracks movement
     */
    public async updateInRoomStatus(
        studentId: string,
        room: string,
        status: InRoomStatus,
        slotId?: string
    ): Promise<void> {
        await this.inRoomStatusCollection.updateOne(
            { studentId, room },
            {
                $set: {
                    status,
                    lastUpdated: new Date(),
                    slotId
                }
            },
            { upsert: true }
        );

        console.log(`[AttendanceService] Updated ${studentId} status to ${status} in ${room}`);
    }

    /**
     * Get in-room status for a student
     */
    public async getInRoomStatus(studentId: string, room: string): Promise<InRoomStatus> {
        const record = await this.inRoomStatusCollection.findOne({ studentId, room });
        return record?.status || "UNKNOWN";
    }

    /**
     * Verify attendance (inside unit scan)
     */
    public async verifyAttendance(
        studentId: string,
        slotId: string,
        timestamp: Date
    ): Promise<{ success: boolean; message: string }> {
        const dateStr = timestamp.toLocaleDateString('en-CA');

        const existing = await this.attendanceCollection.findOne({
            studentId,
            slotId,
            date: dateStr
        });

        if (!existing) {
            return { success: false, message: "No attendance record found. Please scan outside unit first." };
        }

        if (existing.isVerified) {
            return { success: false, message: "Already verified" };
        }

        await this.attendanceCollection.updateOne(
            { _id: existing._id },
            {
                $set: {
                    isVerified: true,
                    verifiedAt: timestamp
                }
            }
        );

        return { success: true, message: "Attendance verified" };
    }

    /**
     * Toggle in/out status (inside unit scan for movement)
     */
    public async toggleMovement(
        studentId: string,
        slotId: string,
        room: string,
        timestamp: Date
    ): Promise<{ success: boolean; newStatus: InRoomStatus; message: string }> {
        const currentStatus = await this.getInRoomStatus(studentId, room);
        const newStatus: InRoomStatus = currentStatus === "IN" ? "OUT" : "IN";

        await this.updateInRoomStatus(studentId, room, newStatus, slotId);

        // Also update the attendance record's inRoomStatus
        const dateStr = timestamp.toLocaleDateString('en-CA');
        await this.attendanceCollection.updateOne(
            { studentId, slotId, date: dateStr },
            {
                $set: {
                    inRoomStatus: newStatus,
                    lastMovementAt: timestamp
                }
            }
        );

        return {
            success: true,
            newStatus,
            message: newStatus === "OUT" ? "Going Out" : "Welcome Back"
        };
    }

    /**
     * Validate attendance uniqueness (prevent duplicates)
     */
    public async validateAttendanceUniqueness(
        studentId: string,
        slotId: string,
        date: string
    ): Promise<boolean> {
        const existing = await this.attendanceCollection.findOne({
            studentId,
            slotId,
            date
        });

        return !existing; // true if unique (no existing record)
    }

    /**
     * Get attendance by source
     */
    public async getAttendanceBySource(
        slotId: string,
        date: string,
        source: AttendanceSource
    ): Promise<any[]> {
        return await this.attendanceCollection.find({
            slotId,
            date,
            source
        }).toArray();
    }

    /**
     * Get attendance record
     */
    public async getAttendanceRecord(studentId: string, slotId: string, date: string) {
        return await this.attendanceCollection.findOne({
            studentId,
            slotId,
            date
        });
    }

    /**
     * Get present students for a slot
     */
    public async getPresentStudents(slotId: string, date: string): Promise<Set<string>> {
        const records = await this.attendanceCollection.find({
            slotId,
            date
        }).toArray();
        return new Set(records.map(r => r.studentId));
    }

    /**
     * Mark whole class present (legacy - now handled by AttendancePoller)
     * Kept for backward compatibility
     */
    public async markWholeClassPresent(activeSlot: ActiveSlot, organizationId: string | undefined) {
        if (!activeSlot.classId) return { success: false, message: "No class ID in slot" };

        const students = await this.usersCollection.find({
            classId: activeSlot.classId,
            role: "student",
            organizationId: organizationId
        }).toArray();

        if (students.length === 0) return { success: false, message: "No students found in class" };

        const now = new Date();
        const dateStr = now.toLocaleDateString('en-CA');

        const operations = students.map(student => ({
            updateOne: {
                filter: {
                    studentId: student.id,
                    slotId: activeSlot.slotId,
                    date: dateStr
                },
                update: {
                    $setOnInsert: {
                        id: new ObjectId().toString(),
                        studentId: student.id,
                        slotId: activeSlot.slotId,
                        rfidTag: student.rfidTag || "AUTO",
                        timestamp: now,
                        date: dateStr,
                        status: "present",
                        deviceId: "AUTO_TEACHER_CHECKIN",
                        pointsEarned: 10,
                        organizationId: organizationId,
                        subjectCode: activeSlot.subjectCode,
                        subjectName: activeSlot.subjectName,
                        teacherId: activeSlot.teacherId,
                        source: "teacher_arrival" as AttendanceSource,
                        isVerified: true,
                        verifiedAt: now,
                        inRoomStatus: "IN" as InRoomStatus,
                        lastMovementAt: now
                    }
                },
                upsert: true
            }
        }));

        if (operations.length === 0) return { success: true, count: 0 };

        const result = await this.attendanceCollection.bulkWrite(operations);

        return {
            success: true,
            message: `Marked ${result.upsertedCount} students present`,
            total: students.length,
            marked: result.upsertedCount
        };
    }

    /**
     * Clear in-room status for all students (day reset)
     */
    public async clearAllInRoomStatus(): Promise<number> {
        const result = await this.inRoomStatusCollection.deleteMany({});
        console.log(`[AttendanceService] Cleared ${result.deletedCount} in-room status records`);
        return result.deletedCount;
    }
}
