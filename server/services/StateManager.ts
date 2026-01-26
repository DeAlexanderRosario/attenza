import { AttendanceState, ActiveSlot, InRoomStatus } from "../types";
import { ActiveSessionService } from "./ActiveSessionService";
import { AttendanceService } from "./AttendanceService";
import { SystemConfigService } from "./SystemConfigService";

/**
 * StateManager - Manages active slots and student in-room status
 * 
 * NOTE: System mode is now managed by ModeManager
 * This class focuses on slot-level state and in-room status tracking
 */
export class StateManager {
    private activeSlots: Map<string, ActiveSlot> = new Map();

    // Callback for re-verification notifications
    public onReVerification?: (room: string, message?: string) => void | Promise<void>;

    /**
     * Static utility to normalize room IDs (handles aliases/mismatches)
     */
    public static normalizeRoom(room: string): string {
        const normalized = room.trim().toUpperCase();
        // Map common aliases to primary Room ID
        if (normalized === "A205" || normalized === "ROOM-A205" || normalized === "ROOM-CSE-1") {
            return "Room-CSE-1";
        }
        return room;
    }

    constructor(
        private activeSessionService: ActiveSessionService | undefined,
        private attendanceService: AttendanceService | undefined,
        private configService: SystemConfigService
    ) { }

    /**
     * Called every minute by the main loop to check for state transitions
     */
    public async checkTime(now: Date) {
        const settings = this.configService.getSettings();
        for (const [room, slot] of this.activeSlots.entries()) {
            // 1. Check Teacher Grace Period Expiry
            if (slot.status === AttendanceState.WAITING_FOR_TEACHER) {
                const minutesSinceStart = (now.getTime() - slot.startTime.getTime()) / 60000;

                if (minutesSinceStart > settings.teacherGraceMins) {
                    console.log(`[State] Slot ${slot.id} CANCELLED. Teacher missed grace period.`);
                    slot.status = AttendanceState.SLOT_CANCELLED;

                    // Persist to DB
                    if (this.activeSessionService && slot.sessionId) {
                        await this.activeSessionService.updateSessionStatus(slot.sessionId, "CANCELLED");
                    }
                }
            }

            // 2. Check Break Warning Buzzer
            if (slot.status === AttendanceState.BREAK && !slot.warningTriggered) {
                const warningTime = new Date(slot.endTime.getTime() - settings.breakWarningMins * 60000);
                if (now >= warningTime) {
                    console.log(`[State] Break warning triggered for ${slot.room}. Beeping buzzer.`);
                    slot.warningTriggered = true;
                    if (this.onReVerification) {
                        this.onReVerification(slot.room, `${settings.breakWarningMins}-Minute Break Warning`);
                    }
                }
            }

            // 3. Check Re-verification Grace Period Expiry
            if (slot.status === AttendanceState.RE_VERIFICATION && slot.reVerificationUntil) {
                if (now >= slot.reVerificationUntil) {
                    console.log(`[State] Re-verification window closed for ${slot.subjectName}`);
                    slot.status = AttendanceState.SLOT_ACTIVE;
                }
            }

            // 4. Handle Transitions (Break to Re-verification)
            if (now >= slot.endTime) {
                if (slot.status === AttendanceState.BREAK) {
                    console.log(`[State] Break ended for ${slot.room}. Entering RE_VERIFICATION.`);
                    slot.status = AttendanceState.RE_VERIFICATION;

                    // Set dynamic grace window
                    const graceEnd = new Date(now.getTime() + settings.reVerificationGraceMins * 60000);
                    slot.reVerificationUntil = graceEnd;

                    if (this.onReVerification) {
                        this.onReVerification(slot.room);
                    }
                } else if (slot.status !== AttendanceState.SLOT_CLOSED && slot.status !== AttendanceState.RE_VERIFICATION) {
                    console.log(`[State] Slot ${slot.id} CLOSED.`);
                    slot.status = AttendanceState.SLOT_CLOSED;

                    // Persist to DB
                    if (this.activeSessionService && slot.sessionId) {
                        await this.activeSessionService.closeSession(slot.sessionId);
                    }
                }
            }
        }
    }

    /**
     * Handles Teacher Check-in
     * Returns true if this action CHANGED the state (e.g., started the class)
     */
    public handleTeacherCheckin(room: string, teacherId: string, timestamp: Date): { changed: boolean, isOverride: boolean, slot?: ActiveSlot } {
        const slot = this.activeSlots.get(room);

        if (!slot) {
            return { changed: false, isOverride: false };
        }

        // Logic: WAITING -> ACTIVE
        if (slot.status === AttendanceState.WAITING_FOR_TEACHER) {

            // CHECK OVERRIDE
            let isOverride = false;
            if (slot.teacherId !== teacherId) {
                console.log(`[State] OVERRIDE: Scheduled ${slot.teacherId}, but ${teacherId} checked in.`);
                isOverride = true;
                slot.isOverridden = true;
                slot.actualTeacherId = teacherId;
            }

            slot.status = AttendanceState.SLOT_ACTIVE;
            slot.teacherArrivedAt = timestamp;

            // Update DB Session Status
            if (this.activeSessionService && slot.sessionId) {
                this.activeSessionService.teacherCheckIn(slot.sessionId, teacherId, timestamp)
                    .catch(e => console.error(`[State] Failed to update check-in for session ${slot.sessionId}`, e));
            }

            console.log(`[State] Class STARTED in ${room}. Status: ACTIVE`);
            return { changed: true, isOverride, slot };
        }

        return { changed: false, isOverride: false };
    }

    /**
     * Update in-room status for a student
     */
    public async updateInRoomStatus(
        studentId: string,
        room: string,
        status: InRoomStatus,
        slotId?: string
    ): Promise<void> {
        if (this.attendanceService) {
            await this.attendanceService.updateInRoomStatus(studentId, room, status, slotId);
        }
    }

    /**
     * Get in-room status for a student
     */
    public async getInRoomStatus(studentId: string, room: string): Promise<InRoomStatus> {
        if (this.attendanceService) {
            return await this.attendanceService.getInRoomStatus(studentId, room);
        }
        return "UNKNOWN";
    }

    /**
     * Clear all in-room status (day reset)
     */
    public async clearInRoomStatus(): Promise<void> {
        if (this.attendanceService) {
            await this.attendanceService.clearAllInRoomStatus();
        }
    }

    /**
     * Initializes a slot (e.g., at 8:50 AM for a 9:00 AM class)
     */
    public initializeSlot(
        slotId: string,
        room: string,
        startTime: Date,
        endTime: Date,
        teacherId: string,
        subjectName: string,
        classId?: string,
        sessionId?: string,
        organizationId?: string,
        subjectCode?: string,
        status?: AttendanceState
    ) {
        this.activeSlots.set(room, {
            id: crypto.randomUUID(),
            slotId,
            room,
            startTime,
            endTime,
            teacherId,
            subjectName,
            subjectCode,
            classId,
            sessionId,
            organizationId,
            status: status || AttendanceState.WAITING_FOR_TEACHER,
            isOverridden: false
        });
        console.log(`[State] ${status ? 'RESUMED' : 'Initialized'} slot for ${subjectName} in ${room} (Session: ${sessionId})`);
    }

    /**
     * Get slot state for a room
     */
    public getSlotState(room: string): ActiveSlot | undefined {
        return this.activeSlots.get(room);
    }

    /**
     * Remove slot from active slots
     */
    public removeSlot(room: string): void {
        this.activeSlots.delete(room);
        console.log(`[State] Removed slot for room ${room}`);
    }

    /**
     * Get all active slots
     */
    public getAllActiveSlots(): Map<string, ActiveSlot> {
        return new Map(this.activeSlots);
    }

    /**
     * Update slot status
     */
    public updateSlotStatus(room: string, status: AttendanceState): void {
        const slot = this.activeSlots.get(room);
        if (slot) {
            slot.status = status;
            console.log(`[State] Updated slot ${room} status to ${status}`);
        }
    }

    /**
     * Set break mode for a slot
     */
    public setBreakMode(room: string): void {
        const slot = this.activeSlots.get(room);
        if (slot) {
            slot.status = AttendanceState.BREAK;
            slot.warningTriggered = false; // Reset warning trigger
            console.log(`[State] Set break mode for ${room}`);
        }
    }

    /**
     * Check if slot is in re-verification window
     */
    public isInReVerificationWindow(room: string): boolean {
        const slot = this.activeSlots.get(room);
        if (!slot) return false;

        if (slot.status === AttendanceState.RE_VERIFICATION && slot.reVerificationUntil) {
            return new Date() < slot.reVerificationUntil;
        }

        return false;
    }
}
