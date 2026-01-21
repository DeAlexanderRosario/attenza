import WebSocket from 'ws';

const SOCKET_URL = "ws://localhost:3003/ws"; // Port 3003 (Avoid 3001 conflict)

// EXISTING DATA
const DEVICE_ID = "device_a205";
const TEACHER_RFID = "RFID-3454";
const STUDENT_RFID = "RFID-983638";

console.log(`[Sim] Connecting to ${SOCKET_URL} as ${DEVICE_ID}...`);
const ws = new WebSocket(SOCKET_URL);

ws.on('open', () => {
    console.log("[Sim] Connected.");

    // 1. Authenticate
    const authMsg = { type: "authenticate", deviceId: DEVICE_ID };
    console.log("[Sim] -> Sending Auth:", authMsg);
    ws.send(JSON.stringify(authMsg));

    // 2. Teacher Scan (Start Class)
    setTimeout(() => {
        console.log(`\n[Sim] 👨‍🏫 Teacher Scanning (${TEACHER_RFID})...`);
        const scanMsg = { type: "rfid_scan", rfidTag: TEACHER_RFID, deviceId: DEVICE_ID };
        ws.send(JSON.stringify(scanMsg));
    }, 2000);

    // 3. Student Scan (Mark Attendance)
    setTimeout(() => {
        console.log(`\n[Sim] 👨‍🎓 Student Scanning (${STUDENT_RFID})...`);
        const scanMsg = { type: "rfid_scan", rfidTag: STUDENT_RFID, deviceId: DEVICE_ID };
        ws.send(JSON.stringify(scanMsg));
    }, 5000);

    // 4. End
    setTimeout(() => {
        console.log("\n[Sim] Simulation Complete. Exiting.");
        process.exit(0);
    }, 8000);
});

ws.on('message', (data) => {
    try {
        const msg = JSON.parse(data.toString());
        console.log("[Sim] <- Received:", JSON.stringify(msg, null, 2));
    } catch (e) {
        console.log("[Sim] <- Received Raw:", data.toString());
    }
});

ws.on('error', (err) => {
    console.error("[Sim] ❌ Error:", err.message);
});
