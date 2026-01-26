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
import { OutsideUnitController } from "./OutsideUnitController";
import { InsideUnitController } from "./InsideUnitController";

export class DeviceController {
    private connections: Map<string, WebSocket> = new Map();
    private outsideController: OutsideUnitController;
    private insideController: InsideUnitController;

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
    ) {
        // Initialize sub-controllers
        this.outsideController = new OutsideUnitController(
            devicesCollection,
            deviceLogsCollection,
            usersCollection,
            stateManager,
            attendanceService,
            slotService,
            whatsAppService,
            activeSessionService,
            modeManager,
            attendancePoller,
            io
        );

        this.insideController = new InsideUnitController(
            deviceLogsCollection,
            stateManager,
            attendanceService,
            slotService,
            activeSessionService,
            modeManager,
            io
        );

        // Bind StateManager callbacks
        this.stateManager.onReVerification = async (room, message) => {
            console.log(`[DeviceController] StateManager callback for ${room}: ${message || 'Re-verification'}`);
            // Trigger notifications and buzzer on inside units
            await this.insideController.triggerBreakWarning(room);
            await this.triggerBuzzer(room, message || "Break Re-verification Started");
        };
    }

    /**
     * Normalize room IDs to handle aliases/mismatches
     */
    private normalizeRoom(room: string): string {
        const normalized = room.trim().toUpperCase();
        // Check if it's A205 or variations
        if (normalized === "A205" || normalized === "ROOM-A205" || normalized === "ROOM-CSE-1") {
            return "Room-CSE-1"; // Map to primary room ID
        }
        return room;
    }

    private async logActivity(deviceId: string, type: string, message: string, detail?: any) {
        console.log(`[DeviceLog] ${deviceId}: ${type} - ${message}`);
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
            console.error("[DeviceLog] Error saving log:", e);
        }
    }

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
            this.connections.set(deviceId, ws);

            // Mark device as online
            await this.devicesCollection.updateOne(
                { deviceId },
                { $set: { status: "online", lastSeen: new Date() } }
            );

            await this.logActivity(deviceId, "AUTH_SUCCESS", `Device ${deviceId} authenticated`);
            ws.send(JSON.stringify({ type: "authenticated", success: true }));
        } else {
            ws.send(JSON.stringify({ type: "authenticated", success: false }));
        }
    }

    private async handleRfidScan(ws: WebSocket, payload: any) {
        const { rfidTag, deviceId } = payload;
        const device = (ws as any).device || { room: "Room-CSE-1" }; // Fallback/Default
        const room = this.normalizeRoom(device.room || "Room-CSE-1");

        const user = await this.usersCollection.findOne({ rfidTag });

        if (!user) {
            ws.send(JSON.stringify({ type: "scan_result", success: false, message: "Unknown Tag", status: 404 }));
            return;
        }

        // Log the initial scan attempt for any user
        await this.logActivity(deviceId, "RFID_SCAN", `${user.name} (${user.role}) scanned RFID tag`, {
            rfidTag,
            room,
            userRole: user.role
        });

        // Delegate based on device placement
        const isOutsideUnit = device.placement === "outside" || device.placement === "Outside";

        if (isOutsideUnit) {
            await this.outsideController.handleScan(ws, payload, user, device, room);
        } else {
            // Assume inside if not explicitly outside
            await this.insideController.handleScan(ws, payload, user, device, room);
        }
    }

    public async triggerBuzzer(room: string, message: string = "3-Minute Re-check Started") {
        const normalizedRoom = this.normalizeRoom(room);
        console.log(`[DeviceController] 🔔 Triggering BUZZER for Room: ${normalizedRoom} - ${message}`);

        // Find all devices in this room (using normalized name)
        const devices = await this.devicesCollection.find({
            room: { $in: [normalizedRoom, "A205", "Room-CSE-1"] }
        }).toArray();

        for (const device of devices) {
            const ws = this.connections.get(device.deviceId);
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                    type: "buzzer_alert",
                    duration: 3000,
                    message: message
                }));
            }
        }
    }
}
