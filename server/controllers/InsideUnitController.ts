import { WebSocket } from "ws";
import { Server } from "socket.io";
import { Collection } from "mongodb";
import { StateManager } from "../services/StateManager";
import { AttendanceService } from "../services/AttendanceService";
import { SlotService } from "../services/SlotService";
import { ActiveSessionService } from "../services/ActiveSessionService";
import { ModeManager } from "../services/ModeManager";
import { SystemMode, AttendanceState } from "../types";

/**
 * InsideUnitController - Handles all RFID scans from inside units
 * 
 * RESPONSIBILITIES:
 * - Attendance verification (after outside scan)
 * - Movement tracking (IN/OUT toggle)
 * - Break warning notification
 * - Break re-verification for next slot auto-attendance
 * - Teachers CANNOT check in via inside unit
 */
export class InsideUnitController {
    constructor(
        private deviceLogsCollection: Collection,
        private stateManager: StateManager,
        private attendanceService: AttendanceService,
        private slotService: SlotService,
        private activeSessionService: ActiveSessionService,
        private modeManager: ModeManager,
        private io: Server
    ) { }

    private async logActivity(deviceId: string, type: string, message: string, detail?: any) {
        console.log(`[InsideUnit] ${deviceId}: ${type} - ${message}`);
        try {
            await this.deviceLogsCollection.insertOne({
                deviceId,
                type,
                message,
                detail,
                timestamp: new Date()
            });
            this.io.emit("device_activity", { deviceId, type, message, timestamp: new Date() });
        } catch (e) {
            console.error("[InsideUnit] Error saving log:", e);
        }
    }

    /**
     * Main entry point for inside unit scans
     */
    public async handleScan(ws: WebSocket, payload: any, user: any, device: any, room: string = "Room-CSE-1") {
        const { rfidTag, deviceId } = payload;
        const now = new Date();
        const userInfo = { name: user.name, reg: user.registerNumber || user.id || "N/A" };

        // Teachers CANNOT check in via inside unit
        if (user.role === "teacher") {
            console.log(`[InsideUnit] ❌ Teacher ${user.name} tried to check in via INSIDE unit`);
            ws.send(JSON.stringify({
                type: "scan_result",
                success: false,
                message: "Teachers must scan OUTSIDE unit to check in",
                role: "TEACHER",
                status: 403,
                user: userInfo
            }));
            return;
        }

        // Get current mode
        const currentMode = this.modeManager.getCurrentMode();

        // Handle based on mode
        if (currentMode === SystemMode.CLOSED) {
            const currentStatus = await this.stateManager.getInRoomStatus(user.id, room);

            // If they are IN, allow them to go OUT (emergency exit)
            if (currentStatus === "IN") {
                console.log(`[InsideUnit] Emergency Exit: ${user.name} leaving closed classroom`);
                await this.handleMovementOnly(ws, user, room, now, deviceId, userInfo);
                return;
            }

            ws.send(JSON.stringify({
                type: "scan_result",
                success: false,
                message: "Classroom Closed",
                beepPattern: "long",
                status: 403,
                user: userInfo
            }));
            return;
        }

        if (currentMode === SystemMode.EARLY_ACCESS_FIRST_SLOT ||
            currentMode === SystemMode.POST_CLASS_FREE_ACCESS ||
            currentMode === SystemMode.BREAK ||
            currentMode === SystemMode.IDLE) {

            // Check if we are in a re-verification window during a break
            const currentSlot = this.stateManager.getSlotState(room);
            if (currentSlot && currentSlot.status === AttendanceState.BREAK) {
                const warningTime = new Date(currentSlot.endTime.getTime() - 3 * 60000);
                if (now >= warningTime) {
                    await this.handleBreakReVerification(ws, user, currentSlot, room, now, deviceId, userInfo);
                    return;
                }
            }

            // Normal movement tracking for BREAK, IDLE, etc.
            await this.handleMovementOnly(ws, user, room, now, deviceId, userInfo);
            return;
        }

        // For SLOT_ACTIVE mode
        await this.handleStudentScan(ws, user, room, now, rfidTag, deviceId, userInfo);
    }

    /**
     * Handle movement tracking only (no attendance)
     */
    private async handleMovementOnly(ws: WebSocket, user: any, room: string, now: Date, deviceId: string, userInfo: any, slotId?: string) {
        const currentStatus = await this.stateManager.getInRoomStatus(user.id, room);
        const newStatus = currentStatus === "IN" ? "OUT" : "IN";

        await this.stateManager.updateInRoomStatus(user.id, room, newStatus, slotId);

        await this.logActivity(deviceId, "movement", `${user.name} ${newStatus === "OUT" ? "left" : "entered"}`, {
            userId: user.id,
            status: newStatus
        });

        ws.send(JSON.stringify({
            type: "scan_result",
            success: true,
            message: newStatus === "OUT" ? "Going Out" : "Welcome Back",
            beepPattern: newStatus === "OUT" ? "long" : "single",
            role: "STUDENT",
            status: 200,
            user: userInfo,
            movement: newStatus
        }));
    }

    /**
     * Handle student scan during active slot or break
     */
    private async handleStudentScan(ws: WebSocket, user: any, room: string, now: Date, rfidTag: string, deviceId: string, userInfo: any) {
        // Get current slot from state
        const currentSlot = this.stateManager.getSlotState(room);

        // Check if there is a scheduled class for this student right now in the timetable
        const scheduledSlot = await this.slotService.getCurrentClassSlot(user.classId, now);

        // INITIALIZATION LOGIC (Handle missing slot OR back-to-back transitions)
        if (scheduledSlot) {
            const isNewSlot = !currentSlot ||
                String(currentSlot.slotId) !== String(scheduledSlot.id) ||
                currentSlot.status === AttendanceState.SLOT_CLOSED ||
                currentSlot.status === AttendanceState.SLOT_CANCELLED;

            if (isNewSlot) {
                console.log(`[InsideUnit] Proactively initializing slot for ${user.name}'s class: ${scheduledSlot.subjectName}`);

                const [startH, startM] = scheduledSlot.startTime.split(':').map(Number);
                const startTime = new Date(now);
                startTime.setHours(startH, startM, 0, 0);

                const [endH, endM] = scheduledSlot.endTime.split(':').map(Number);
                const endTime = new Date(now);
                endTime.setHours(endH, endM, 0, 0);

                this.stateManager.initializeSlot(
                    String(scheduledSlot.id || scheduledSlot.classSlotId),
                    room,
                    startTime,
                    endTime,
                    scheduledSlot.teacherId,
                    scheduledSlot.subjectName,
                    user.classId,
                    undefined, // No session yet
                    user.organizationId,
                    scheduledSlot.subjectCode,
                    AttendanceState.WAITING_FOR_TEACHER
                );

                // Now handle movement (Wait status doesn't need attendance yet)
                await this.handleMovementOnly(ws, user, room, now, deviceId, userInfo, String(scheduledSlot.id || scheduledSlot.classSlotId));
                return;
            }
        }

        // NO SCHEDULED CLASS CASE
        if (!currentSlot) {
            // FINAL FALLBACK: Always allow movement during operating hours
            console.log(`[InsideUnit] ✅ No active slot found, but allowing movement for ${user.name}`);
            await this.handleMovementOnly(ws, user, room, now, deviceId, userInfo);
            return;
        }

        // Check if student is in the class
        if (user.classId !== currentSlot.classId) {
            console.log(`[InsideUnit] ❌ ${user.name} not in this class`);
            ws.send(JSON.stringify({
                type: "scan_result",
                success: false,
                message: "Not Your Class",
                role: "STUDENT",
                status: 403,
                user: userInfo
            }));
            return;
        }

        const dateStr = now.toLocaleDateString('en-CA');

        // Check for break re-verification window
        if (currentSlot.status === AttendanceState.BREAK) {
            await this.handleBreakReVerification(ws, user, currentSlot, room, now, deviceId, userInfo);
            return;
        }

        // ALLOW MOVEMENT TOGGLE DURING WAITING_FOR_TEACHER
        if (currentSlot.status === AttendanceState.WAITING_FOR_TEACHER) {
            console.log(`[InsideUnit] ✅ Student ${user.name} toggled movement while waiting for teacher`);
            await this.handleMovementOnly(ws, user, room, now, deviceId, userInfo, currentSlot.slotId);
            return;
        }

        // Get existing attendance record
        const existing = await this.attendanceService.getAttendanceRecord(user.id, currentSlot.slotId, dateStr);

        if (!existing) {
            // No attendance record - must scan outside first
            console.log(`[InsideUnit] ❌ ${user.name} has no attendance record`);
            ws.send(JSON.stringify({
                type: "scan_result",
                success: false,
                message: "Please scan OUTSIDE unit first",
                role: "STUDENT",
                status: 403,
                user: userInfo
            }));
            return;
        }

        // Check if already verified
        if (!existing.isVerified) {
            // First-time verification
            const result = await this.attendanceService.verifyAttendance(user.id, currentSlot.slotId, now);

            if (result.success) {
                await this.logActivity(deviceId, "attendance_verified", `${user.name} verified attendance`, {
                    userId: user.id,
                    slotId: currentSlot.slotId
                });

                ws.send(JSON.stringify({
                    type: "scan_result",
                    success: true,
                    message: "Attendance Verified",
                    role: "STUDENT",
                    status: 200,
                    user: userInfo,
                    movement: "IN"
                }));

                // Notify dashboard
                this.io.emit("new_activity", {
                    user: user.name,
                    action: "Verified Attendance",
                    time: now.toLocaleTimeString(),
                    status: 'success'
                });
            } else {
                ws.send(JSON.stringify({
                    type: "scan_result",
                    success: false,
                    message: result.message,
                    role: "STUDENT",
                    status: 409,
                    user: userInfo
                }));
            }
            return;
        }

        // Already verified - toggle movement
        const result = await this.attendanceService.toggleMovement(user.id, currentSlot.slotId, room, now);

        if (result.success) {
            await this.logActivity(deviceId, "movement", `${user.name} ${result.newStatus === "OUT" ? "left" : "returned"}`, {
                userId: user.id,
                status: result.newStatus
            });

            ws.send(JSON.stringify({
                type: "scan_result",
                success: true,
                message: result.message,
                role: "STUDENT",
                status: 200,
                user: userInfo,
                movement: result.newStatus
            }));

            // Notify dashboard
            this.io.emit("new_activity", {
                user: user.name,
                action: result.message,
                time: now.toLocaleTimeString(),
                status: result.newStatus === "OUT" ? 'warning' : 'success',
                movement: result.newStatus
            });
        } else {
            ws.send(JSON.stringify({
                type: "scan_result",
                success: false,
                message: "Movement tracking failed",
                role: "STUDENT",
                status: 500,
                user: userInfo
            }));
        }
    }

    /**
     * Handle break re-verification (3 min before break ends)
     */
    private async handleBreakReVerification(ws: WebSocket, user: any, currentSlot: any, room: string, now: Date, deviceId: string, userInfo: any) {
        // Check if we're in the warning window (3 min before break ends)
        const warningTime = new Date(currentSlot.endTime.getTime() - 3 * 60000);

        if (now < warningTime) {
            // Too early for re-verification - just track movement
            await this.handleMovementOnly(ws, user, room, now, deviceId, userInfo);
            return;
        }

        console.log(`[InsideUnit] 🔔 Break re-verification for ${user.name}`);

        // Mark student as re-verified
        if (currentSlot.sessionId) {
            await this.activeSessionService.markStudentReVerified(currentSlot.sessionId, user.id);
        }

        // Update in-room status to IN
        await this.stateManager.updateInRoomStatus(user.id, room, "IN", currentSlot.slotId);

        // Get next slot after break
        const nextSlot = await this.slotService.getNextSlotAfterBreak(currentSlot.slotId);

        if (nextSlot) {
            // Create attendance for next slot
            const nextDateStr = now.toLocaleDateString('en-CA');
            const nextSlotData = await this.slotService.getCurrentClassSlot(user.classId, new Date(currentSlot.endTime.getTime() + 60000)); // 1 min after break

            if (nextSlotData) {
                // Create attendance record for next slot
                await this.attendanceService.createAttendanceFromSnapshot(
                    [user.id],
                    {
                        ...currentSlot,
                        slotId: nextSlot.id.toString(),
                        subjectName: nextSlotData.subjectName,
                        subjectCode: nextSlotData.subjectCode,
                        teacherId: nextSlotData.teacherId
                    },
                    now,
                    "auto_re_verification"
                );

                console.log(`[InsideUnit] ✅ Auto-attendance created for ${user.name} for next slot`);
            }
        }

        await this.logActivity(deviceId, "break_re_verification", `${user.name} re-verified for next slot`, {
            userId: user.id,
            currentSlotId: currentSlot.slotId,
            nextSlotId: nextSlot?.id
        });

        ws.send(JSON.stringify({
            type: "scan_result",
            success: true,
            message: "Re-verified for Next Class",
            role: "STUDENT",
            status: 200,
            user: userInfo,
            movement: "IN",
            nextSlot: nextSlot?.label
        }));

        // Notify dashboard
        this.io.emit("new_activity", {
            user: user.name,
            action: "Re-verified (In Room)",
            time: now.toLocaleTimeString(),
            status: 'success'
        });
    }

    /**
     * Trigger break warning buzzer
     */
    public async triggerBreakWarning(room: string) {
        console.log(`[InsideUnit] 🔔 Triggering break warning for ${room}`);

        this.io.to(`room:${room}`).emit("break_warning", {
            message: "Break ending soon. Re-verify to qualify for next slot auto-attendance.",
            timestamp: new Date()
        });

        // Also trigger buzzer with distinct pattern
        this.io.to(`device:inside:${room}`).emit("buzzer", {
            message: "Break Warning",
            pattern: "break_warning", // Distinct pattern
            timestamp: new Date()
        });
    }
}
