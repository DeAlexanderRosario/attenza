import { Collection, ObjectId } from "mongodb";
import { ActiveSlot, AttendanceState } from "../types";

export class AttendanceService {
    constructor(
        private attendanceCollection: Collection,
        private usersCollection: Collection
    ) { }

    public async markStudent(
        student: { id: string, name: string },
        slot: ActiveSlot,
        timestamp: Date,
        deviceId: string,
        rfidTag: string
    ) {
        // RULE: Attendance exists inside SLOT_ACTIVE or via Early Check-in (handled by caller passing valid slot)
        // We relax the check to allow 'active' or 'upcoming' conceptually, but since slot struct is passed, 
        // we can just check if slot is valid. For now, we trust the caller (DeviceController) to only pass valid slots.
        if (slot.status !== AttendanceState.SLOT_ACTIVE && slot.status !== AttendanceState.SLOT_UPCOMING) {
            // If strictly 'ended', we might block, but for flexibility we'll allow it if the caller determined it's relevant.
            // We'll just warn if it's completely off.
            if (slot.status === AttendanceState.SLOT_CLOSED) {
                return { success: false, message: "Class has ended" };
            }
            // For WAITING_FOR_TEACHER, we allow check-in (Early Bird)
        }

        // 1. Calculate Status (Present vs Late)
        const graceStart = slot.teacherArrivedAt || slot.startTime;
        const diffMins = (timestamp.getTime() - graceStart.getTime()) / 60000;

        let status = "present";
        let points = 10;

        if (diffMins > 5) {
            status = "late";
            points = 5;
        }

        // Generate Date String YYYY-MM-DD for uniqueness scope
        const dateStr = timestamp.toLocaleDateString('en-CA'); // 'en-CA' gives YYYY-MM-DD

        // 2. Check Duplicate (Idempotency) - SCOPED BY DATE
        const existing = await this.attendanceCollection.findOne({
            studentId: student.id,
            slotId: slot.slotId,
            date: dateStr
        });

        if (existing) {
            return { success: false, message: "Already Marked" };
        }

        // 3. Persist to DB
        const record = {
            id: new ObjectId().toString(),
            studentId: student.id,
            slotId: slot.slotId,
            rfidTag,
            timestamp,
            date: dateStr, // Store explicit date for querying
            status: status as "present" | "late",
            deviceId,
            pointsEarned: points,
            subjectCode: slot.subjectCode, // Add Subject Code
            teacherId: slot.teacherId // Add Teacher ID
        };

        await this.attendanceCollection.insertOne(record);

        // 4. Update Leaderboard Points
        await this.usersCollection.updateOne(
            { id: student.id },
            { $inc: { points: points } }
        );

        return { success: true, status, message: `Marked ${status.toUpperCase()}`, points };
    }

    public async markWholeClassPresent(activeSlot: ActiveSlot, organizationId: string | undefined) {
        if (!activeSlot.classId) return { success: false, message: "No class ID in slot" };

        // 1. Get all students in this class
        const students = await this.usersCollection.find({
            classId: activeSlot.classId,
            role: "student",
            organizationId: organizationId
        }).toArray();

        if (students.length === 0) return { success: false, message: "No students found in class" };

        const now = new Date();
        const dateStr = now.toLocaleDateString('en-CA'); // YYYY-MM-DD

        // 2. Prepare bulk operations
        const operations = students.map(student => ({
            updateOne: {
                filter: {
                    studentId: student.id,
                    slotId: activeSlot.slotId,
                    date: dateStr // Ensure unique per day
                },
                update: {
                    $setOnInsert: {
                        id: new ObjectId().toString(),
                        studentId: student.id,
                        slotId: activeSlot.slotId,
                        rfidTag: student.rfidTag || "AUTO",
                        timestamp: now,
                        date: dateStr, // Store date
                        status: "present",
                        deviceId: "AUTO_TEACHER_CHECKIN",
                        pointsEarned: 10,
                        organizationId: organizationId,
                        subjectCode: activeSlot.subjectCode, // Add Subject Code
                        teacherId: activeSlot.teacherId // Add Teacher ID
                    }
                },
                upsert: true
            }
        }));

        if (operations.length === 0) return { success: true, count: 0 };

        // 3. Execute Bulk Write
        const result = await this.attendanceCollection.bulkWrite(operations);

        return {
            success: true,
            message: `Marked ${result.upsertedCount} students present`,
            total: students.length,
            marked: result.upsertedCount
        };
    }

    public async getPresentStudents(slotId: string, date: string): Promise<Set<string>> {
        const records = await this.attendanceCollection.find({
            slotId,
            date
        }).toArray();
        // Return Set of Student IDs
        return new Set(records.map(r => r.studentId));
    }
}
