import { Collection } from "mongodb";

export interface ActiveSession {
    sessionId: string;
    slotId?: string;
    classId: string;
    room: string;
    deviceId: string;
    teacherId: string;
    actualTeacherId?: string;
    subjectName: string;
    subjectCode?: string;

    // Timing
    startTime: Date;
    endTime: Date;
    teacherArrivedAt?: Date;

    // Status
    status: "WAITING_FOR_TEACHER" | "ACTIVE" | "CLOSED" | "CANCELLED" | "BREAK";
    isOverridden: boolean;

    // Attendance Poller
    attendancePollerTriggered?: boolean;
    teacherArrivalSnapshot?: {
        timestamp: Date;
        insideCount: number;
        outsideCount: number;
    };

    // Re-verification tracking
    reVerifiedStudents?: string[]; // Array of student IDs who re-verified during break

    // Metadata
    organizationId: string;
    createdAt: Date;
    updatedAt: Date;
}

export class ActiveSessionService {
    constructor(
        private sessionsCollection: Collection,
        private usersCollection: Collection
    ) { }

    /**
     * Check if a room is currently occupied by an active session
     */
    async checkRoomAvailability(room: string, organizationId: string): Promise<{
        available: boolean;
        activeSession?: ActiveSession;
        occupiedBy?: string;
        occupiedUntil?: Date;
    }> {
        const activeSession = await this.sessionsCollection.findOne({
            room,
            organizationId,
            status: { $in: ["WAITING_FOR_TEACHER", "ACTIVE"] }
        }) as ActiveSession | null;

        if (activeSession) {
            const now = new Date();
            // PROACTIVE CLEANUP: If session has expired, treat as available
            if (now >= activeSession.endTime) {
                console.log(`[ActiveSession] Session ${activeSession.sessionId} in ${room} has expired. Marking CLOSED.`);
                await this.closeSession(activeSession.sessionId);
                return { available: true };
            }

            // Get teacher name
            const teacher = await this.usersCollection.findOne({
                id: activeSession.actualTeacherId || activeSession.teacherId
            });

            return {
                available: false,
                activeSession,
                occupiedBy: teacher?.name || "Unknown Teacher",
                occupiedUntil: activeSession.endTime
            };
        }

        return { available: true };
    }

    /**
     * Create a new active session
     */
    async createSession(sessionData: {
        slotId?: string;
        classId: string;
        room: string;
        deviceId: string;
        teacherId: string;
        subjectName: string;
        subjectCode?: string;
        startTime: Date;
        endTime: Date;
        organizationId: string;
    }): Promise<ActiveSession> {
        // SENOUR AUDIT: Check if a session already exists for this slot/room to prevent duplicates
        if (sessionData.slotId) {
            const idStr = String(sessionData.slotId);
            const idNum = parseInt(idStr, 10);

            const existing = await this.sessionsCollection.findOne({
                room: sessionData.room,
                $or: [{ slotId: idStr }, { slotId: idNum }],
                status: { $in: ["WAITING_FOR_TEACHER", "ACTIVE", "BREAK"] },
                organizationId: sessionData.organizationId
            }) as ActiveSession | null;

            if (existing) {
                console.log(`[ActiveSession] Session already exists for slot ${sessionData.slotId} in ${sessionData.room}. Returning existing.`);
                return existing;
            }
        }

        const session: ActiveSession = {
            sessionId: crypto.randomUUID(),
            ...sessionData,
            status: "WAITING_FOR_TEACHER",
            isOverridden: false,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        await this.sessionsCollection.insertOne(session);
        console.log(`[ActiveSession] Created session ${session.sessionId} in room ${session.room}`);

        return session;
    }

    /**
     * Get active session in a room
     */
    async getActiveSessionInRoom(room: string, organizationId: string): Promise<ActiveSession | null> {
        const session = await this.sessionsCollection.findOne({
            room,
            organizationId,
            status: { $in: ["WAITING_FOR_TEACHER", "ACTIVE"] }
        }) as ActiveSession | null;

        if (session && new Date() >= session.endTime) {
            await this.closeSession(session.sessionId);
            return null;
        }

        return session;
    }

    /**
     * Mark teacher check-in
     */
    async teacherCheckIn(sessionId: string, teacherId: string, timestamp: Date): Promise<{
        success: boolean;
        isOverride: boolean;
        session?: ActiveSession;
    }> {
        const session = await this.sessionsCollection.findOne({ sessionId }) as ActiveSession | null;

        if (!session) {
            return { success: false, isOverride: false };
        }

        const isOverride = session.teacherId !== teacherId;

        await this.sessionsCollection.updateOne(
            { sessionId },
            {
                $set: {
                    status: "ACTIVE",
                    teacherArrivedAt: timestamp,
                    actualTeacherId: isOverride ? teacherId : undefined,
                    isOverridden: isOverride,
                    updatedAt: new Date()
                }
            }
        );

        console.log(`[ActiveSession] Teacher ${teacherId} checked in to session ${sessionId}${isOverride ? ' (OVERRIDE)' : ''}`);

        const updatedSession = await this.sessionsCollection.findOne({ sessionId }) as unknown as ActiveSession;
        return { success: true, isOverride, session: updatedSession };
    }

    /**
     * Update session status
     */
    async updateSessionStatus(sessionId: string, status: ActiveSession["status"]): Promise<void> {
        await this.sessionsCollection.updateOne(
            { sessionId },
            {
                $set: {
                    status,
                    updatedAt: new Date()
                }
            }
        );
        console.log(`[ActiveSession] Updated session ${sessionId} status to ${status}`);
    }

    /**
     * Close a session
     */
    async closeSession(sessionId: string): Promise<void> {
        await this.updateSessionStatus(sessionId, "CLOSED");
    }

    /**
     * Cleanup expired sessions (sessions past their end time)
     */
    async cleanupExpiredSessions(): Promise<number> {
        const now = new Date();

        const result = await this.sessionsCollection.updateMany(
            {
                endTime: { $lt: now },
                status: { $in: ["WAITING_FOR_TEACHER", "ACTIVE"] }
            },
            {
                $set: {
                    status: "CLOSED",
                    updatedAt: now
                }
            }
        );

        if (result.modifiedCount > 0) {
            console.log(`[ActiveSession] Cleaned up ${result.modifiedCount} expired session(s)`);
        }

        return result.modifiedCount;
    }

    /**
     * Cancel sessions where teacher never arrived
     */
    async cancelAbandonedSessions(graceMinutes: number = 15): Promise<number> {
        const cutoffTime = new Date(Date.now() - graceMinutes * 60 * 1000);

        const result = await this.sessionsCollection.updateMany(
            {
                status: "WAITING_FOR_TEACHER",
                startTime: { $lt: cutoffTime }
            },
            {
                $set: {
                    status: "CANCELLED",
                    updatedAt: new Date()
                }
            }
        );

        if (result.modifiedCount > 0) {
            console.log(`[ActiveSession] Cancelled ${result.modifiedCount} abandoned session(s)`);
        }

        return result.modifiedCount;
    }

    /**
     * Mark attendance poller as triggered
     */
    async setAttendancePollerTriggered(sessionId: string, insideCount: number, outsideCount: number): Promise<void> {
        await this.sessionsCollection.updateOne(
            { sessionId },
            {
                $set: {
                    attendancePollerTriggered: true,
                    teacherArrivalSnapshot: {
                        timestamp: new Date(),
                        insideCount,
                        outsideCount
                    },
                    updatedAt: new Date()
                }
            }
        );
        console.log(`[ActiveSession] Attendance poller triggered for session ${sessionId}`);
    }

    /**
     * Mark student as re-verified during break
     */
    async markStudentReVerified(sessionId: string, studentId: string): Promise<void> {
        await this.sessionsCollection.updateOne(
            { sessionId },
            {
                $addToSet: { reVerifiedStudents: studentId },
                $set: { updatedAt: new Date() }
            }
        );
        console.log(`[ActiveSession] Student ${studentId} re-verified for session ${sessionId}`);
    }

    /**
     * Get re-verified students for a session
     */
    async getReVerifiedStudents(sessionId: string): Promise<string[]> {
        const session = await this.sessionsCollection.findOne({ sessionId }) as ActiveSession | null;
        return session?.reVerifiedStudents || [];
    }

    /**
     * Check if attendance poller was triggered
     */
    async wasAttendancePollerTriggered(sessionId: string): Promise<boolean> {
        const session = await this.sessionsCollection.findOne({ sessionId }) as ActiveSession | null;
        return session?.attendancePollerTriggered || false;
    }

    /**
     * Get session by slot ID and date
     */
    async getSessionBySlot(slotId: string, organizationId: string): Promise<ActiveSession | null> {
        const session = await this.sessionsCollection.findOne({
            slotId,
            organizationId,
            status: { $in: ["WAITING_FOR_TEACHER", "ACTIVE", "BREAK"] }
        }) as ActiveSession | null;

        return session;
    }
}
