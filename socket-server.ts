import { createServer } from "http";
import { Server, Socket } from "socket.io";
import { WebSocketServer, WebSocket } from "ws";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";

import { StateManager } from "./server/services/StateManager";
import { AttendanceService } from "./server/services/AttendanceService";
import { WhatsAppService } from "./server/services/WhatsAppService";
import { SlotService } from "./server/services/SlotService";
import { ActiveSessionService } from "./server/services/ActiveSessionService";
import { ModeManager } from "./server/services/ModeManager";
import { AttendancePoller } from "./server/services/AttendancePoller";
import { DeviceController } from "./server/controllers/DeviceController";
import { SystemConfigService } from "./server/services/SystemConfigService";

dotenv.config();

const port = parseInt(process.env.SOCKET_PORT || "3001", 10);
const DB_URL = process.env.MONGODB_URI || "mongodb+srv://despicablehaythamkenway:egEI0lJZVEZ3Kgz3@cluster0.ateoqxd.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

async function startServer() {
    try {
        // --- 1. CONFIGURATION & SERVER SETUP ---
        const httpServer = createServer((req, res) => {
            res.writeHead(200);
            res.end("Student Attendance Socket Server Alive");
        });

        const io = new Server(httpServer, {
            cors: { origin: "*", methods: ["GET", "POST"] }
        });

        const wss = new WebSocketServer({ noServer: true });

        httpServer.on("upgrade", (req, socket, head) => {
            if (req.url === "/ws") {
                wss.handleUpgrade(req, socket, head, (ws) => {
                    wss.emit("connection", ws, req);
                });
            } else if (req.url?.startsWith("/socket.io/")) {
                return;
            } else {
                socket.destroy();
            }
        });

        // --- 2. DATABASE CONNECTION ---
        const client = new MongoClient(DB_URL);
        await client.connect();
        const db = client.db("attenza"); // Explicit DB name
        console.log("[Server] Connected to MongoDB (Database: attenza)");

        // Collections
        const devicesCollection = db.collection("devices");
        const usersCollection = db.collection("users");
        const attendanceCollection = db.collection("attendance");
        const slotsCollection = db.collection("college_slots");
        const settingsCollection = db.collection("system_settings");
        const classesCollection = db.collection("classes");
        const deviceLogsCollection = db.collection("device_logs");
        const inRoomStatusCollection = db.collection("in_room_status"); // NEW

        // --- 3. INITIALIZE SERVICES (DEPENDENCY INJECTION) ---

        // Base Services
        const whatsAppService = new WhatsAppService(usersCollection);
        const configService = new SystemConfigService(settingsCollection);
        await configService.initialize();

        const slotService = new SlotService(slotsCollection, settingsCollection, classesCollection, configService);

        // 1. Attendance Service (needs inRoomStatusCollection)
        const attendanceService = new AttendanceService(
            attendanceCollection,
            usersCollection,
            inRoomStatusCollection
        );

        // 2. Attendance Poller (needs AttendanceService)
        const attendancePoller = new AttendancePoller(
            attendanceService, // Inject Service here
            usersCollection,
            inRoomStatusCollection,
            whatsAppService,
            configService
        );

        // 3. Mode Manager (needs SlotService)
        const modeManager = new ModeManager(slotService, configService, io);

        // 4. Active Session Service
        const activeSessionService = new ActiveSessionService(
            db.collection("active_sessions"),
            usersCollection
        );

        // 5. State Manager (needs ActiveSessionService and AttendanceService)
        const stateManager = new StateManager(activeSessionService, attendanceService, configService);

        // 6. Link StateManager back to ModeManager
        modeManager.setStateManager(stateManager);

        // 7. Device Controller (Orchestrator)
        const deviceController = new DeviceController(
            devicesCollection,
            deviceLogsCollection,
            usersCollection,
            stateManager,
            attendanceService,
            slotService,
            whatsAppService,
            activeSessionService,
            modeManager, // ModeManager back to Controller
            attendancePoller,
            io
        );

        // --- 4. INITIAL MODE CHECK ---
        // Check mode immediately on startup to set correct initial state
        await modeManager.checkModeTransitions();
        console.log(`[Server] Initial mode set to: ${modeManager.getCurrentMode()}`);

        // --- 5. START PROCESSES ---

        // A. Mode Transition Loop (Check mode transitions every minute)
        setInterval(async () => {
            await modeManager.checkModeTransitions();
        }, 60000); // Check every minute

        // B. State Manager Time Check Loop (Time-based events like Cancellations)
        setInterval(() => {
            stateManager.checkTime(new Date());
        }, 60000); // Check every minute

        // C. Session Cleanup Loop (Cleanup expired sessions)
        setInterval(async () => {
            await activeSessionService.cleanupExpiredSessions();
            await activeSessionService.cancelAbandonedSessions(5);
        }, 5 * 60 * 1000); // Every 5 minutes

        // D. WebSocket Listener (Hardware)
        wss.on("connection", (ws: WebSocket) => {
            deviceController.handleConnection(ws);
        });

        // E. Socket.IO Listener (Frontend)
        io.on("connection", (socket: Socket) => {
            console.log("[IO] Frontend connected:", socket.id);
            socket.on("join_user_room", (id) => socket.join(`user:${id}`));

            // 📩 Text Relay Event
            socket.on("relay_whatsapp", async (data: { userId?: string, phone?: string, getTargetId?: string, text: string }, callback) => {
                console.log("[IO] Relay Request:", data);
                let success = false;

                if (data.userId) {
                    success = await whatsAppService.sendUserMessage(data.userId, data.text);
                } else if (data.phone) {
                    success = await whatsAppService.sendDirectMessage(data.phone, data.text);
                }

                if (callback) callback({ success });
            });

            socket.on("disconnect", () => console.log("[IO] Disconnected:", socket.id));
        });

        // --- 5. LISTEN ---
        httpServer.listen(port, () => {
            console.log(`> 🚀 Production Attendance Server running on port ${port}`);
            console.log(`> 🔗 WebSocket: ws://localhost:${port}/ws`);
            console.log(`> 🔗 Socket.IO: http://localhost:${port}`);
            console.log(`> 🎯 System Mode: ${modeManager.getCurrentMode()}`);
        });

    } catch (e) {
        console.error("❌ Fatal Error starting server:", e);
        process.exit(1);
    }
}

startServer();
