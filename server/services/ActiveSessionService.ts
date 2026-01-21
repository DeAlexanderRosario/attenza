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

    // Timing
    startTime: Date;
    endTime: Date;
    teacherArrivedAt?: Date;

    // Status
    status: "WAITING_FOR_TEACHER" | "ACTIVE" | "CLOSED" | "CANCELLED";
    isOverridden: boolean;

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
        startTime: Date;
        endTime: Date;
        organizationId: string;
    }): Promise<ActiveSession> {
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
        return await this.sessionsCollection.findOne({
            room,
            organizationId,
            status: { $in: ["WAITING_FOR_TEACHER", "ACTIVE"] }
        }) as ActiveSession | null;
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
    async cancelAbandonedSessions(graceMinutes: number = 5): Promise<number> {
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
}
