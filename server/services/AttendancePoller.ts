import { Collection, ObjectId } from "mongodb";
import { AttendanceSnapshot, AttendanceSource, InRoomStatus } from "../types";
import { WhatsAppService } from "./WhatsAppService";
import { AttendanceService } from "./AttendanceService";
import { SystemConfigService } from "./SystemConfigService";

/**
 * AttendancePoller - Snapshot-based Attendance Creation
 * 
 * TRIGGERED BY: Teacher arrival (outside unit scan)
 */
export class AttendancePoller {
    constructor(
        private attendanceService: AttendanceService,
        private usersCollection: Collection,
        private inRoomStatusCollection: Collection,
        private whatsAppService: WhatsAppService,
        private configService: SystemConfigService
    ) {
        console.log("[AttendancePoller] Initialized");
    }

    /**
     * Main entry point - Trigger attendance poll on teacher arrival
     */
    public async triggerPoll(
        slotId: string,
        classId: string,
        room: string,
        teacherId: string,
        subjectName: string,
        subjectCode: string | undefined,
        organizationId: string | undefined,
        timestamp: Date = new Date()
    ): Promise<{
        success: boolean;
        snapshot?: AttendanceSnapshot;
        markedPresent: number;
        notifiedAbsent: number;
        error?: string;
    }> {
        console.log(`[AttendancePoller] Triggering poll for ${subjectName} (${slotId}) in ${room}`);

        try {
            // 1. Get snapshot of current student positions
            const snapshot = await this.getInRoomSnapshot(classId, room, slotId, timestamp);

            console.log(`[AttendancePoller] Snapshot: ${snapshot.insideStudents.length} INSIDE, ${snapshot.outsideStudents.length} OUTSIDE`);

            // 2. Create attendance records for INSIDE students via hardened AttendanceService
            const result = await this.attendanceService.createAttendanceFromSnapshot(
                snapshot.insideStudents.map(s => s.studentId),
                {
                    slotId,
                    classId,
                    room,
                    teacherId,
                    subjectName,
                    subjectCode,
                    organizationId,
                    startTime: timestamp,
                    endTime: timestamp,
                    id: ""
                } as any,
                timestamp,
                "teacher_arrival"
            );

            // 3. Notify OUTSIDE students
            const notifiedCount = await this.notifyAbsentStudents(
                snapshot.outsideStudents,
                subjectName,
                room,
                timestamp
            );

            console.log(`[AttendancePoller] Poll complete: ${result.count} marked present, ${notifiedCount} notified`);

            return {
                success: true,
                snapshot,
                markedPresent: result.count,
                notifiedAbsent: notifiedCount
            };

        } catch (error) {
            console.error("[AttendancePoller] Error during poll:", error);
            return {
                success: false,
                markedPresent: 0,
                notifiedAbsent: 0,
                error: error instanceof Error ? error.message : "Unknown error"
            };
        }
    }

    /**
     * Get snapshot of student positions (IN/OUT)
     */
    private async getInRoomSnapshot(
        classId: string,
        room: string,
        slotId: string,
        timestamp: Date
    ): Promise<AttendanceSnapshot> {
        // 1. Get all students in the class
        const students = await this.usersCollection.find({
            classId,
            role: "student"
        }).toArray();

        if (students.length === 0) {
            return { slotId, classId, timestamp, insideStudents: [], outsideStudents: [] };
        }

        // 2. BULK OPTIMIZATION (Senour deep audit): Fetch all statuses in one query
        const studentIds = students.map(s => s.id);
        const statusRecords = await this.inRoomStatusCollection.find({
            studentId: { $in: studentIds },
            room
        }).toArray();

        // Create a fast-lookup map
        const statusMap = new Map<string, InRoomStatus>();
        statusRecords.forEach(rec => statusMap.set(rec.studentId, rec.status as InRoomStatus));

        const insideStudents: AttendanceSnapshot['insideStudents'] = [];
        const outsideStudents: AttendanceSnapshot['outsideStudents'] = [];

        for (const student of students) {
            const status = statusMap.get(student.id) || "UNKNOWN";

            if (status === "IN") {
                insideStudents.push({
                    studentId: student.id,
                    name: student.name,
                    rfidTag: student.rfidTag
                });
            } else {
                outsideStudents.push({
                    studentId: student.id,
                    name: student.name,
                    phoneNumber: student.phoneNumber
                });
            }
        }

        return {
            slotId,
            classId,
            timestamp,
            insideStudents,
            outsideStudents
        };
    }

    /**
     * Notify OUTSIDE students (absent)
     */
    private async notifyAbsentStudents(
        outsideStudents: Array<{ studentId: string; name: string; phoneNumber?: string }>,
        subjectName: string,
        room: string,
        timestamp: Date
    ): Promise<number> {
        if (outsideStudents.length === 0) return 0;

        let notifiedCount = 0;
        const settings = this.configService.getSettings();
        const graceMins = settings.studentRegularWindowMins;

        for (const student of outsideStudents) {
            if (!student.phoneNumber) continue;

            try {
                await this.whatsAppService.sendDirectMessage(
                    student.phoneNumber,
                    `⚠️ *TrueCheck Attendance Warning* ⚠️\n` +
                    `━━━━━━━━━━━━━━━━━━━━\n` +
                    `📢 *TEACHER ARRIVAL DETECTED*\n\n` +
                    `📍 *Subject:* ${subjectName}\n` +
                    `🏢 *Location:* ${room}\n` +
                    `🕒 *Grace Period:* ${graceMins} Minutes remaining\n\n` +
                    `🔔 *Status Rules:*\n` +
                    `• Scans < ${graceMins} mins: ✅ *Present*\n` +
                    `• Scans > ${graceMins} mins: ⚠️ *Late*\n\n` +
                    `👉 _Scan your ID at the Outside Unit now!_\n` +
                    `━━━━━━━━━━━━━━━━━━━━`
                );
                notifiedCount++;
            } catch (error) {
                console.error(`[AttendancePoller] Failed to notify ${student.name}:`, error);
            }
        }
        return notifiedCount;
    }

    /**
     * Get attendance statistics for a poll
     */
    public async getPollStats(slotId: string, date: string): Promise<{
        total: number;
        present: number;
        absent: number;
        late: number;
    }> {
        const records = await (this.attendanceService as any).attendanceCollection.find({
            slotId,
            date
        }).toArray();

        const present = records.filter((r: any) => r.status === "present" && r.source === "teacher_arrival").length;
        const late = records.filter((r: any) => r.status === "late").length;
        const total = records.length;
        const absent = total - present - late;

        return { total, present, absent, late };
    }
}
