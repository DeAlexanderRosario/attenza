import { WebSocket } from "ws";
import { Server } from "socket.io";
import { Collection } from "mongodb";
import { StateManager } from "../services/StateManager";
import { AttendanceService } from "../services/AttendanceService";
import { SlotService } from "../services/SlotService";
import { WhatsAppService } from "../services/WhatsAppService";
import { ActiveSessionService } from "../services/ActiveSessionService";
import { ModeManager } from "../services/ModeManager";
import { AttendancePoller } from "../services/AttendancePoller";
import { SystemMode, AttendanceState } from "../types";

/**
 * OutsideUnitController - Handles all RFID scans from outside units
 * 
 * RESPONSIBILITIES:
 * - Early access entry (30 min before first slot)
 * - Teacher arrival & attendance poller trigger
 * - Student late entry (within entry window)
 * - Post-class free access
 * - Entry window enforcement
 * - Break re-verification
 */
export class OutsideUnitController {
    constructor(
        private devicesCollection: Collection,
        private deviceLogsCollection: Collection,
        private usersCollection: Collection,
        private stateManager: StateManager,
        private attendanceService: AttendanceService,
        private slotService: SlotService,
        private whatsAppService: WhatsAppService,
        private activeSessionService: ActiveSessionService,
        private modeManager: ModeManager,
        private attendancePoller: AttendancePoller,
        private io: Server
    ) { }

    private async logActivity(deviceId: string, type: string, message: string, detail?: any) {
        console.log(`[OutsideUnit] ${deviceId}: ${type} - ${message}`);
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
            console.error("[OutsideUnit] Error saving log:", e);
        }
    }

    /**
     * Main entry point for outside unit scans
     */
    public async handleScan(ws: WebSocket, payload: any, user: any, device: any, room: string = "Room-CSE-1") {
        const { rfidTag, deviceId } = payload;
        const now = new Date();
        const userInfo = { name: user.name, reg: user.registerNumber || user.id || "N/A" };

        // Get current system mode
        const currentMode = this.modeManager.getCurrentMode();
        console.log(`[OutsideUnit] Scan received in mode: ${currentMode}`);

        // MODE-BASED ROUTING
        switch (currentMode) {
            case SystemMode.CLOSED:
                await this.handleClosed(ws, user, userInfo, room);
                return;

            case SystemMode.EARLY_ACCESS_FIRST_SLOT:
                await this.handleEarlyAccess(ws, user, room, now, deviceId, userInfo);
                return;

            case SystemMode.POST_CLASS_FREE_ACCESS:
                await this.handlePostClassFreeAccess(ws, user, room, now, deviceId, userInfo);
                return;

            case SystemMode.IDLE:
            case SystemMode.SLOT_ACTIVE:
            case SystemMode.BREAK:
                // Continue to role-based handling
                break;

            default:
                console.log(`[OutsideUnit] Unknown mode: ${currentMode}`);
                ws.send(JSON.stringify({
                    type: "scan_result",
                    success: false,
                    message: "System mode error",
                    status: 500,
                    user: userInfo
                }));
                return;
        }

        // ROLE-BASED HANDLING
        if (user.role === "teacher") {
            await this.handleTeacherScan(ws, user, room, now, deviceId, userInfo);
        } else {
            await this.handleStudentScan(ws, user, room, now, rfidTag, deviceId, userInfo);
        }
    }

    /**
     * Handle scans when classroom is closed
     */
    private async handleClosed(ws: WebSocket, user: any, userInfo: any, room: string) {
        const currentStatus = await this.stateManager.getInRoomStatus(user.id, room);

        // If they are IN, allow them to go OUT (safety/emergency exit)
        if (currentStatus === "IN") {
            console.log(`[OutsideUnit] Emergency Exit: ${user.name} leaving closed classroom`);
            await this.stateManager.updateInRoomStatus(user.id, room, "OUT");

            ws.send(JSON.stringify({
                type: "scan_result",
                success: true,
                message: "Emergency Exit",
                beepPattern: "single", // Standard exit beep
                role: user.role.toUpperCase(),
                status: 200,
                user: userInfo,
                movement: "OUT"
            }));
            return;
        }

        console.log(`[OutsideUnit] ❌ ${user.name} tried to enter closed classroom`);
        ws.send(JSON.stringify({
            type: "scan_result",
            success: false,
            message: "Classroom Closed",
            beepPattern: "long", // Long failure beep
            status: 403,
            user: userInfo
        }));
    }

    /**
     * Handle early access (30 min before first slot)
     */
    private async handleEarlyAccess(ws: WebSocket, user: any, room: string, now: Date, deviceId: string, userInfo: any) {
        const currentStatus = await this.stateManager.getInRoomStatus(user.id, room);
        const newStatus = currentStatus === "IN" ? "OUT" : "IN";

        console.log(`[OutsideUnit] ✅ Early Access: ${user.name} (${newStatus})`);

        // Update in-room status
        await this.stateManager.updateInRoomStatus(user.id, room, newStatus);

        // Log activity
        await this.logActivity(deviceId, "early_access", `${user.name} ${newStatus === "IN" ? "entered" : "left"} during early access`, { userId: user.id, status: newStatus });

        // Send response with SINGLE BEEP
        ws.send(JSON.stringify({
            type: "scan_result",
            success: true,
            message: newStatus === "IN" ? "Entry Granted" : "Exited Room",
            beepPattern: "single",
            status: 200,
            user: userInfo,
            mode: "EARLY_ACCESS",
            movement: newStatus
        }));
    }

    /**
     * Handle post-class free access
     */
    private async handlePostClassFreeAccess(ws: WebSocket, user: any, room: string, now: Date, deviceId: string, userInfo: any) {
        const currentStatus = await this.stateManager.getInRoomStatus(user.id, room);
        const newStatus = currentStatus === "IN" ? "OUT" : "IN";

        console.log(`[OutsideUnit] ✅ Post-Class Free Access: ${user.name} (${newStatus})`);

        // Update in-room status (no attendance)
        await this.stateManager.updateInRoomStatus(user.id, room, newStatus);

        // Log activity
        await this.logActivity(deviceId, "free_access", `${user.name} ${newStatus === "IN" ? "entered" : "left"} during free access`, { userId: user.id, status: newStatus });

        // Send response
        ws.send(JSON.stringify({
            type: "scan_result",
            success: true,
            message: newStatus === "IN" ? "Entry Granted" : "Exited Room",
            beepPattern: "single",
            status: 200,
            user: userInfo,
            mode: "POST_CLASS_FREE_ACCESS",
            movement: newStatus
        }));
    }

    /**
     * Handle teacher scan
     */
    private async handleTeacherScan(ws: WebSocket, user: any, room: string, now: Date, deviceId: string, userInfo: any) {
        // Get teacher's scheduled slot
        const teacherSlot = await this.slotService.getCurrentTeacherSlot(user.id, now);

        if (!teacherSlot) {
            console.log(`[OutsideUnit] ❌ No scheduled class for teacher ${user.name}`);
            ws.send(JSON.stringify({
                type: "scan_result",
                success: false,
                message: "No Scheduled Class",
                role: "TEACHER",
                status: 404,
                user: userInfo
            }));
            return;
        }

        // Check if already checked in
        const existingSlot = this.stateManager.getSlotState(room);
        if (existingSlot &&
            String(existingSlot.slotId) === String(teacherSlot.id) &&
            existingSlot.status === AttendanceState.SLOT_ACTIVE) {

            console.log(`[OutsideUnit] ⚠ Teacher ${user.name} already checked in`);
            ws.send(JSON.stringify({
                type: "scan_result",
                success: false,
                message: "Already Checked In",
                role: "TEACHER",
                status: 409,
                user: userInfo
            }));
            return;
        }

        // Initialize slot if not exists OR it's a different slot OR the current one is closed/cancelled
        const isNewSlot = !existingSlot ||
            String(existingSlot.slotId) !== String(teacherSlot.id) ||
            existingSlot.status === AttendanceState.SLOT_CLOSED ||
            existingSlot.status === AttendanceState.SLOT_CANCELLED;

        if (isNewSlot || (existingSlot && !existingSlot.sessionId)) {
            console.log(`[OutsideUnit] ${isNewSlot ? 'Initializing new' : 'Completing proactive'} slot for ${teacherSlot.subjectName} in ${room}`);

            const [startH, startM] = teacherSlot.startTime.split(':').map(Number);
            const startTime = new Date(now);
            startTime.setHours(startH, startM, 0, 0);

            const [endH, endM] = teacherSlot.endTime.split(':').map(Number);
            const endTime = new Date(now);
            endTime.setHours(endH, endM, 0, 0);

            // Create session in DB
            const session = await this.activeSessionService.createSession({
                slotId: String(teacherSlot.id),
                classId: teacherSlot.classId,
                room,
                deviceId,
                teacherId: user.id,
                subjectName: teacherSlot.subjectName,
                subjectCode: teacherSlot.subjectCode,
                startTime,
                endTime,
                organizationId: user.organizationId
            });

            if (isNewSlot) {
                // Completely new initialization
                this.stateManager.initializeSlot(
                    String(teacherSlot.id),
                    room,
                    startTime,
                    endTime,
                    user.id,
                    teacherSlot.subjectName,
                    teacherSlot.classId,
                    session.sessionId,
                    user.organizationId,
                    teacherSlot.subjectCode
                );
            } else {
                // Just attach session to existing proactive slot
                existingSlot.sessionId = session.sessionId;
                console.log(`[OutsideUnit] Attached session ${session.sessionId} to proactively initialized slot.`);
            }
        }

        // Handle teacher check-in
        const result = this.stateManager.handleTeacherCheckin(room, user.id, now);

        if (result.changed && result.slot) {
            // TRIGGER ATTENDANCE POLLER
            await this.triggerAttendancePoller(result.slot, now);

            // Transition mode to SLOT_ACTIVE
            await this.modeManager.forceMode(SystemMode.SLOT_ACTIVE, `Teacher ${user.name} arrived`, "teacher_arrival");

            // Log activity
            await this.logActivity(deviceId, "teacher_checkin", `${user.name} checked in for ${teacherSlot.subjectName}`, {
                userId: user.id,
                slotId: teacherSlot.id,
                isOverride: result.isOverride
            });

            // Send response with DOUBLE BEEP
            ws.send(JSON.stringify({
                type: "scan_result",
                success: true,
                message: result.isOverride ? "Override Check-In" : "Teacher Checked In",
                beepPattern: "double", // Double beep for teacher arrival
                role: "TEACHER",
                status: 200,
                user: userInfo,
                subject: teacherSlot.subjectName,
                isOverride: result.isOverride
            }));

            // Notify dashboard
            this.io.emit("teacher_arrived", {
                teacher: user.name,
                subject: teacherSlot.subjectName,
                room,
                time: now.toLocaleTimeString(),
                isOverride: result.isOverride
            });
        } else {
            ws.send(JSON.stringify({
                type: "scan_result",
                success: false,
                message: "Check-in Failed",
                role: "TEACHER",
                status: 500,
                user: userInfo
            }));
        }
    }

    /**
     * Trigger attendance poller on teacher arrival
     */
    private async triggerAttendancePoller(slot: any, timestamp: Date) {
        console.log(`[OutsideUnit] 🔔 Triggering Attendance Poller for ${slot.subjectName}`);

        const result = await this.attendancePoller.triggerPoll(
            slot.slotId,
            slot.classId,
            slot.room,
            slot.actualTeacherId || slot.teacherId,
            slot.subjectName,
            slot.subjectCode,
            slot.organizationId,
            timestamp
        );

        if (result.success) {
            console.log(`[OutsideUnit] ✅ Attendance Poller: ${result.markedPresent} present, ${result.notifiedAbsent} notified`);

            // Mark poller as triggered in session
            if (slot.sessionId) {
                await this.activeSessionService.setAttendancePollerTriggered(
                    slot.sessionId,
                    result.markedPresent,
                    result.notifiedAbsent
                );
            }
        } else {
            console.error(`[OutsideUnit] ❌ Attendance Poller failed: ${result.error}`);
        }
    }

    /**
     * Handle student scan
     */
    private async handleStudentScan(ws: WebSocket, user: any, room: string, now: Date, rfidTag: string, deviceId: string, userInfo: any) {
        // Get current slot
        const currentSlot = this.stateManager.getSlotState(room);

        if (!currentSlot) {
            // Check if there is a scheduled class for this student right now
            const scheduledSlot = await this.slotService.getCurrentClassSlot(user.classId, now);

            if (scheduledSlot) {
                console.log(`[OutsideUnit] Proactively initializing slot for ${user.name}'s class: ${scheduledSlot.subjectName}`);

                const [startH, startM] = scheduledSlot.startTime.split(':').map(Number);
                const startTime = new Date(now);
                startTime.setHours(startH, startM, 0, 0);

                const [endH, endM] = scheduledSlot.endTime.split(':').map(Number);
                const endTime = new Date(now);
                endTime.setHours(endH, endM, 0, 0);

                this.stateManager.initializeSlot(
                    scheduledSlot.id || scheduledSlot.classSlotId,
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

                // Now toggle movement for WAITING_FOR_TEACHER
                const currentStatus = await this.stateManager.getInRoomStatus(user.id, room);
                const newStatus = currentStatus === "IN" ? "OUT" : "IN";

                await this.stateManager.updateInRoomStatus(user.id, room, newStatus, scheduledSlot.id || scheduledSlot.classSlotId);

                ws.send(JSON.stringify({
                    type: "scan_result",
                    success: true,
                    message: newStatus === "IN" ? "Entered Room (Waiting for Teacher)" : "Left Room",
                    role: "STUDENT",
                    status: 200,
                    user: userInfo,
                    movement: newStatus
                }));
                return;
            }

            // FINAL FALLBACK: Always allow movement during operating hours (BREAK, IDLE, or missing timetable)
            const currentStatus = await this.stateManager.getInRoomStatus(user.id, room);
            const newStatus = currentStatus === "IN" ? "OUT" : "IN";

            console.log(`[OutsideUnit] ✅ No active slot found, but allowing movement for ${user.name} (${newStatus})`);
            await this.stateManager.updateInRoomStatus(user.id, room, newStatus);

            ws.send(JSON.stringify({
                type: "scan_result",
                success: true,
                message: newStatus === "IN" ? "Welcome" : "Goodbye",
                beepPattern: "single",
                role: "STUDENT",
                status: 200,
                user: userInfo,
                movement: newStatus
            }));
            return;
        }

        // Check if student is in the class
        if (user.classId !== currentSlot.classId) {
            console.log(`[OutsideUnit] ❌ ${user.name} not in this class`);
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

        // ALLOW TOGGLE DURING WAITING_FOR_TEACHER OR SLOT_ACTIVE
        if (currentSlot.status === AttendanceState.WAITING_FOR_TEACHER) {
            const currentStatus = await this.stateManager.getInRoomStatus(user.id, room);
            const newStatus = currentStatus === "IN" ? "OUT" : "IN";

            console.log(`[OutsideUnit] ✅ Student ${user.name} ${newStatus === "IN" ? "entered" : "left"} while waiting for teacher`);

            // Update status
            await this.stateManager.updateInRoomStatus(user.id, room, newStatus, currentSlot.slotId);

            ws.send(JSON.stringify({
                type: "scan_result",
                success: true,
                message: newStatus === "IN" ? "Entered" : "Left",
                beepPattern: "single",
                role: "STUDENT",
                status: 200,
                user: userInfo,
                movement: newStatus
            }));
            return;
        }

        if (currentSlot.status !== AttendanceState.SLOT_ACTIVE) {
            console.log(`[OutsideUnit] ❌ Slot in state ${currentSlot.status}, rejecting ${user.name}`);
            ws.send(JSON.stringify({
                type: "scan_result",
                success: false,
                message: "Class Not Accessible",
                role: "STUDENT",
                status: 403,
                user: userInfo
            }));
            return;
        }

        // --- LATE ENTRY LOGIC (Always allowed if SLOT_ACTIVE) ---
        // Check if already has attendance
        const dateStr = now.toLocaleDateString('en-CA');
        const existing = await this.attendanceService.getAttendanceRecord(user.id, currentSlot.slotId, dateStr);

        if (existing) {
            // Already has attendance - toggle in-room status
            const currentStatus = await this.stateManager.getInRoomStatus(user.id, room);
            const newStatus = currentStatus === "IN" ? "OUT" : "IN";

            await this.stateManager.updateInRoomStatus(user.id, room, newStatus, currentSlot.slotId);

            ws.send(JSON.stringify({
                type: "scan_result",
                success: true,
                message: newStatus === "IN" ? "Welcome Back" : "Going Out",
                role: "STUDENT",
                status: 200,
                user: userInfo,
                movement: newStatus
            }));
            return;
        }

        // Mark late entry
        const result = await this.attendanceService.markLateEntry(
            { id: user.id, name: user.name },
            currentSlot,
            now,
            deviceId,
            rfidTag
        );

        if (result.success) {
            // Update in-room status
            await this.stateManager.updateInRoomStatus(user.id, room, "IN", currentSlot.slotId);

            // Log activity
            await this.logActivity(deviceId, "student_late_entry", `${user.name} marked ${result.message}`, {
                userId: user.id,
                slotId: currentSlot.slotId,
                points: result.points
            });

            // Send response
            ws.send(JSON.stringify({
                type: "scan_result",
                success: true,
                message: result.message,
                role: "STUDENT",
                status: 200,
                user: userInfo,
                points: result.points
            }));

            // Notify dashboard
            this.io.emit("new_activity", {
                user: user.name,
                action: result.message,
                time: now.toLocaleTimeString(),
                status: result.points === 10 ? 'success' : 'warning',
                points: result.points
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
    }

    /**
     * Trigger buzzer (for break warnings, etc.)
     */
    async triggerBuzzer(room: string, message: string) {
        const device = await this.devicesCollection.findOne({ room });
        if (!device) {
            console.warn(`[OutsideUnit] No device found for room ${room}`);
            return;
        }

        this.io.to(`device:${device.id}`).emit("buzzer", {
            message,
            pattern: "warning", // Distinct pattern for warnings
            timestamp: new Date()
        });

        console.log(`[OutsideUnit] 🔔 Buzzer triggered for ${room}: ${message}`);
    }
}
