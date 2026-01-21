import WebSocket from 'ws';

const SOCKET_URL = "ws://localhost:3001/ws";

// DEVICES
const DEVICE_OUTSIDE = "device_a205";
const DEVICE_INSIDE = "device_a206_inside";

// CONFIG
const SELECTED_DEVICE = process.argv[2] === "inside" ? DEVICE_INSIDE : DEVICE_OUTSIDE;
const STUDENT_RFID = "RFID-7357"; // Test Student

console.log(`[Client] Connecting to ${SOCKET_URL} as ${SELECTED_DEVICE}...`);
const ws = new WebSocket(SOCKET_URL);

ws.on('open', () => {
    console.log("[Client] Connected.");

    // 1. Authenticate
    const authMsg = { type: "authenticate", deviceId: SELECTED_DEVICE };
    console.log("[Client] Sending Auth:", authMsg);
    ws.send(JSON.stringify(authMsg));

    // 2. Scan after delay
    setTimeout(() => {
        console.log(`[Client] Simulating Scan on ${SELECTED_DEVICE} (${process.argv[2] === "inside" ? "Inside/Break" : "Outside/Entry"})...`);
        const scanMsg = { type: "rfid_scan", rfidTag: STUDENT_RFID, deviceId: SELECTED_DEVICE };
        console.log("[Client] Sending Scan:", scanMsg);
        ws.send(JSON.stringify(scanMsg));
    }, 2000);
});

ws.on('message', (data) => {
    try {
        const msg = JSON.parse(data.toString());
        console.log("[Client] Received:", msg);

        if (msg.type === "scan_result") {
            console.log("[Client] Scan complete. Closing in 2s...");
            setTimeout(() => process.exit(0), 2000);
        }
    } catch (e) {
        console.log("[Client] Received Raw:", data.toString());
    }
});

ws.on('error', (err) => {
    console.error("[Client] Error:", err.message);
});

ws.on('close', () => {
    console.log("[Client] Connection Closed.");
});
