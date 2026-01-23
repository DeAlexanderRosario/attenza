import { WebSocket } from "ws";
import { Server } from "socket.io";
import { Collection } from "mongodb";
import { StateManager } from "../services/StateManager";
import { AttendanceService } from "../services/AttendanceService";
import { SlotService } from "../services/SlotService";
import { WhatsAppService } from "../services/WhatsAppService";
import { ActiveSessionService } from "../services/ActiveSessionService";
import { ActiveSlot, AttendanceState } from "../types";

export class DeviceController {
    constructor(
        private devicesCollection: Collection,
        private usersCollection: Collection,
        private stateManager: StateManager,
        private attendanceService: AttendanceService,
        private slotService: SlotService,
        private whatsAppService: WhatsAppService,
        private activeSessionService: ActiveSessionService,
        private io: Server
    ) { }

    public async handleConnection(ws: WebSocket) {
        console.log("[WS] Device connected");

        ws.on("message", async (msg: Buffer | string) => {
            try {
                const payload = JSON.parse(msg.toString());
                console.log("[WS] Payload:", payload);

                if (payload.type === "authenticate") {
                    await this.handleAuthenticate(ws, payload);
                } else if (payload.type === "rfid_scan") {
                    await this.handleRfidScan(ws, payload);
                }

            } catch (e) {
                console.error("[WS] Error parsing message:", e);
            }
        });
    }

    private async handleAuthenticate(ws: WebSocket, payload: any) {
        const { deviceId } = payload;
        const device = await this.devicesCollection.findOne({ deviceId });

        if (device) {
            (ws as any).device = device;

            // Mark device as online
            await this.devicesCollection.updateOne(
                { deviceId },
                { $set: { status: "online", lastSeen: new Date() } }
            );

            ws.send(JSON.stringify({ type: "authenticated", success: true }));
        } else {
            ws.send(JSON.stringify({ type: "authenticated", success: false }));
        }
    }

    private async handleRfidScan(ws: WebSocket, payload: any) {
        const { rfidTag, deviceId } = payload;
        const device = (ws as any).device || { room: "Room-CSE-1" }; // Fallback/Default
        const room = device.room || "Room-CSE-1";
        const now = new Date();

        const user = await this.usersCollection.findOne({ rfidTag });

        if (!user) {
            ws.send(JSON.stringify({ type: "scan_result", success: false, message: "Unknown Tag", status: 404 }));
            return;
        }

        // --- TEACHER LOGIC ---
        if (user.role === "teacher") {
            await this.handleTeacherScan(ws, user, room, now, device.classId, deviceId);
            return;
        }

        // --- STUDENT LOGIC ---
        await this.handleStudentScan(ws, user, room, now, rfidTag, deviceId);
    }

    private async handleTeacherScan(ws: WebSocket, user: any, room: string, now: Date, deviceClassId: string | undefined, deviceId?: string) {
        // 1. Get/Create Active Slot
        let activeSlot = this.stateManager.getSlotState(room);

        if (!activeSlot) {
            // DYNAMIC FETCH FROM DB
            let classId = deviceClassId;

            // If classId is missing, try to fetch it from the device in the database
            if (!classId) {
                const deviceData = (ws as any).device;
                const lookupDeviceId = deviceData?.deviceId || deviceId; // Use payload deviceId as fallback

                if (lookupDeviceId) {
                    console.log(`[DeviceController] ClassId missing, fetching from DB for device: ${lookupDeviceId}`);
                    const dbDevice = await this.devicesCollection.findOne({ deviceId: lookupDeviceId });
                    classId = dbDevice?.classId;

                    if (classId) {
                        console.log(`[DeviceController] ✅ Found classId in database: ${classId}`);
                    }
                }
            }

            if (!classId) {
                const deviceData = (ws as any).device;
                const deviceInfo = deviceData?.deviceId || deviceId || 'unknown';
                console.warn(`[DeviceController] No Class ID linked to device '${deviceInfo}'. Cannot find schedule.`);
                ws.send(JSON.stringify({
                    type: "scan_result",
                    success: false,
                    message: `Device '${deviceInfo}' not linked to Class. Please update device in database with classId field.`,
                    role: "TEACHER",
                    status: 403
                }));
                return;
            }

            // ✅ CHECK ROOM AVAILABILITY BEFORE CREATING SESSION
            const device = await this.devicesCollection.findOne({ deviceId: deviceId || (ws as any).device?.deviceId });
            const organizationId = device?.organizationId || user.organizationId;

            const roomCheck = await this.activeSessionService.checkRoomAvailability(room, organizationId);

            if (!roomCheck.available) {
                const endTime = roomCheck.occupiedUntil?.toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit'
                });
                const message = `Room ${room} is occupied by ${roomCheck.occupiedBy} until ${endTime}`;

                console.warn(`[DeviceController] ${message}`);
                ws.send(JSON.stringify({
                    type: "scan_result",
                    success: false,
                    message,
                    role: "TEACHER",
                    occupiedBy: roomCheck.occupiedBy,
                    occupiedUntil: roomCheck.occupiedUntil,
                    status: 429
                }));
                return;
            }

            // 1. Find the scheduled class for THIS CLASS (Device)
            const scheduledSlot = await this.slotService.getCurrentClassSlot(classId, now);

            if (scheduledSlot) {
                // Calculate accurate end time from slot duration
                // scheduledSlot should have startTime/endTime strings (e.g. "09:00", "10:00") or duration
                // standardized in SlotService. For now, assuming standard 60 if not present, but better to parse.
                // If scheduledSlot has 'endTime' (HH:mm), let's parse it relative to 'now's date.

                let sessionEndTime = new Date(now.getTime() + 60 * 60000); // Default 60 mins
                if (scheduledSlot.endTime) {
                    const [hours, minutes] = scheduledSlot.endTime.split(':').map(Number);
                    const end = new Date(now);
                    end.setHours(hours, minutes, 0, 0);
                    // If end time is earlier than now (crossing midnight? uncommon for schools), handle? assuming same day.
                    sessionEndTime = end;
                } else if (scheduledSlot.duration) {
                    sessionEndTime = new Date(now.getTime() + scheduledSlot.duration * 60000);
                }

                // ✅ CREATE SESSION IN DATABASE
                const session = await this.activeSessionService.createSession({
                    slotId: scheduledSlot.id,
                    classId: scheduledSlot.classId,
                    room,
                    deviceId: deviceId || (ws as any).device?.deviceId || 'unknown',
                    teacherId: scheduledSlot.teacherId,
                    subjectName: scheduledSlot.subjectName || "Class",
                    startTime: now,
                    endTime: sessionEndTime,
                    organizationId
                });

                // Initialize Slot with Real Class Data (for backward compatibility)
                this.stateManager.initializeSlot(
                    `slot-${scheduledSlot.id || now.getTime()}`,
                    room,
                    now,
                    sessionEndTime,
                    user.id, // The scanning teacher becomes the ACTIVE teacher
                    scheduledSlot.subjectName || "Class",
                    scheduledSlot.classId,
                    session.sessionId, // ✅ Pass DB Session ID
                    organizationId,    // ✅ Pass Org ID
                    scheduledSlot.subjectCode // ✅ Pass Subject Code
                );

                // Warn if scanning teacher is NOT the scheduled teacher (Substitution)
                if (scheduledSlot.teacherId !== user.id) {
                    console.log(`[Substitution] Scheduled: ${scheduledSlot.teacherId}, Actual: ${user.id}`);
                }

            } else {
                // ✅ CREATE AD-HOC SESSION IN DATABASE
                const session = await this.activeSessionService.createSession({
                    classId,
                    room,
                    deviceId: deviceId || (ws as any).device?.deviceId || 'unknown',
                    teacherId: user.id,
                    subjectName: "Ad-hoc Session",
                    startTime: now,
                    endTime: new Date(now.getTime() + 60 * 60000), // Ad-hoc default 60 mins
                    organizationId
                });

                // Start a generic ad-hoc class if no schedule found
                this.stateManager.initializeSlot(
                    `adhoc-${now.getTime()}`,
                    room,
                    now,
                    new Date(now.getTime() + 60 * 60000),
                    user.id,
                    "Ad-hoc Session",
                    classId,
                    session.sessionId, // ✅ Pass DB Session ID
                    organizationId    // ✅ Pass Org ID
                );
            }
        }

        const result = this.stateManager.handleTeacherCheckin(room, user.id, now);
        const isAdhoc = result.slot?.id?.includes('adhoc');

        if (result.changed) {
            let msg = `Welcome ${user.name}`;
            if (result.isOverride) {
                msg = `OVERRIDE: Class taken by ${user.name}`;
            }

            // ALWAYS send alert for testing
            console.log(`🔔 Sending WhatsApp Alert to ${user.name}...`);
            await this.whatsAppService.sendTeacherArrivalAlert(
                user.name,
                result.slot?.subjectName || "Class",
                user.id
            );

            if (result.isOverride) {
                // Double alert or specific logic if needed, but for now the above covers it.
            }

            ws.send(JSON.stringify({ 
                type: "scan_result", 
                success: true, 
                message: msg, 
                role: "TEACHER",
                status: isAdhoc ? 202 : 201 
            }));

            // Notify Admin Dashboard
            this.io.emit("activity_log", {
                type: "teacher_checkin",
                user: user.name,
                message: msg,
                isOverride: result.isOverride,
                time: now.toISOString()
            });

            // 📢 NOTIFY STUDENTS (ONLY THOSE NOT CHECKED IN)
            this.notifyClassStudents(result.slot?.classId, user.name, result.slot?.subjectName, result.slot?.slotId);

            // REMOVED: Bulk Marking. Now strict student check-in.

        } else {
            ws.send(JSON.stringify({ 
                type: "scan_result", 
                success: true, 
                message: "Already Checked In", 
                role: "TEACHER",
                status: 409
            }));
        }
    }

    private async notifyClassStudents(classId: string | undefined, teacherName: string, subject: string | undefined, slotId?: string) {
        if (!classId) return;

        console.log(`[Notification] Fetching students for class ${classId}...`);

        try {
            // 2. Fetch Students from THIS Class
            const students = await this.usersCollection.find({
                classId: classId,
                role: "student"
            }).toArray();

            console.log(`[Notification] Found ${students.length} students in class.`);

            // FILTER: If slotId provided, exclude present students
            let targetStudents = students;
            if (slotId) {
                const now = new Date();
                const dateStr = now.toLocaleDateString('en-CA');
                const presentSet = await this.attendanceService.getPresentStudents(slotId, dateStr);
                targetStudents = students.filter(s => !presentSet.has(s.id));
                console.log(`[Notification] Filtering: ${students.length} total -> ${targetStudents.length} not checked in.`);
            }

            // 3. Send WhatsApp to each
            for (const student of targetStudents) {
                if (student.phoneNumber || student.mobileAuth) {
                    const phone = student.phoneNumber || student.mobileAuth; // Handle variant fields
                    const teacher = teacherName.trim();
                    const sub = (subject || "Class").trim();
                    const now = new Date();
                    const time = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
                    const day = now.toLocaleDateString('en-IN', { weekday: 'long' });

                    const msg =
                        `🔔 *CLASS STARTED*\n\n` +
                        `📅 *Day:* ${day}\n` +
                        `👨‍🏫 *Teacher:* ${teacher}\n` +
                        `📘 *Subject:* ${sub}\n` +
                        `⏰ *Time:* ${time}\n\n` +
                        `👉 _Please arrive within 5 minutes to avoid being marked late._`;

                    await this.whatsAppService.sendDirectMessage(phone, msg);
                } else if (student.id) {
                    const teacher = teacherName.trim();
                    const sub = (subject || "Class").trim();
                    const now = new Date();
                    const time = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
                    const day = now.toLocaleDateString('en-IN', { weekday: 'long' });

                    const msg =
                        `🔔 *CLASS STARTED*\n\n` +
                        `📅 *Day:* ${day}\n` +
                        `👨‍🏫 *Teacher:* ${teacher}\n` +
                        `📘 *Subject:* ${sub}\n` +
                        `⏰ *Time:* ${time}\n\n` +
                        `👉 _Please arrive within 5 minutes to avoid being marked late._`;

                    // Fallback to internal ID messaging if service supports it
                    await this.whatsAppService.sendUserMessage(student.id, msg);
                }
            }
            console.log(`[Notification] Alerts sent to ${students.length} students.`);

        } catch (e) {
            console.error("[Notification] Error sending alerts:", e);
        }
    }

    private async handleStudentScan(ws: WebSocket, user: any, room: string, now: Date, rfidTag: string, deviceId: string) {
        // 1. Check if class is running
        let currentSlot = this.stateManager.getSlotState(room);

        // EARLY CHECK-IN LOGIC
        if (!currentSlot) {
            // Look ahead 30 mins
            const userClassId = user.classId;
            if (userClassId) {
                const lookaheadTime = new Date(now.getTime() + 30 * 60000);
                const upcoming = await this.slotService.getCurrentClassSlot(userClassId, lookaheadTime);

                if (upcoming) {
                    // Verify this slot is for this ROOM?
                    // Currently slotService returns schedule. StateManager manages rooms.
                    // The scan is happening AT the room device. 
                    // IMPORTANT: We should verify if the upcoming slot is indeed scheduled for this room.
                    // But for now assuming the device->class link or room logic covers it.
                    // We construct a temporary 'ActiveSlot' for attendance marking.
                    // NOTE: We do not START the session here (teacher does that). We just allow attendance.

                    const [startH, startM] = upcoming.startTime ? upcoming.startTime.split(':').map(Number) : [now.getHours(), now.getMinutes()];
                    const startTime = new Date(now);
                    startTime.setHours(startH, startM, 0, 0);

                    const [endH, endM] = upcoming.endTime ? upcoming.endTime.split(':').map(Number) : [now.getHours() + 1, now.getMinutes()];
                    const endTime = new Date(now);
                    endTime.setHours(endH, endM, 0, 0);

                    currentSlot = {
                        id: `adhoc-${upcoming.id}-${now.getTime()}`, // temp id
                        slotId: `${upcoming.id}`,
                        subjectName: upcoming.subjectName || "Future Class",
                        teacherId: upcoming.teacherId,
                        room: room,
                        classId: userClassId,
                        status: AttendanceState.SLOT_UPCOMING, // Bypass strict check
                        startTime: startTime,
                        endTime: endTime,
                        isOverridden: false,
                        subjectCode: upcoming.subjectCode
                    };
                    console.log(`[Early Checkin] Allowed for ${user.name} into upcoming slot ${upcoming.subjectName}`);
                }
            }
        }

        if (!currentSlot) {
            ws.send(JSON.stringify({ type: "scan_result", success: false, message: "No Class Active", status: 405 }));
            return;
        }

        // 2. Mark Attendance
        const result = await this.attendanceService.markStudent(
            { id: user.id, name: user.name },
            currentSlot,
            now,
            deviceId,
            rfidTag
        );

        ws.send(JSON.stringify({
            type: "scan_result",
            success: result.success,
            message: result.message,
            studentName: user.name,
            status: result.success ? 200 : 409, // 200 for OK, 409 if already done (assuming result.success is false there)
            attendanceStatus: result.status // PRESENT / LATE
        }));

        if (result.success) {
            // Real-time Dashboard Update
            const deviceObj = (ws as any).device;
            const placement = deviceObj?.placement ? ` (${deviceObj.placement})` : "";

            this.io.emit("new_activity", {
                user: user.name,
                action: (result.status === 'present' ? 'Checked In' : 'Marked Late') + placement,
                time: now.toLocaleTimeString(),
                status: result.status === 'present' ? 'success' : 'warning',
                points: result.points
            });

            // Notify Student App
            this.io.to(`user:${user.id}`).emit("notification", {
                userId: user.id,
                title: `Attendance Marked`,
                message: `You are ${result.status}`,
                timestamp: now
            });
        }
    }
}
