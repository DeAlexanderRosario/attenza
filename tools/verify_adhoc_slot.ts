import WebSocket from 'ws';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SOCKET_URL = "ws://localhost:3003/ws";
const MONGODB_URI = process.env.MONGODB_URI;

async function runVerification() {
    if (!MONGODB_URI) {
        console.error("❌ MONGODB_URI not found");
        process.exit(1);
    }

    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db("attenza");

    console.log("🛠️ Preparing Verification Data...");

    const ORG_ID = "org_verify_adhoc";
    const CLASS_ID = "class_verify_adhoc";
    const TEACHER_RFID = "RFID-VERIFY-ADHOC";
    const DEVICE_ID = "device_verify_adhoc";

    // 1. Setup Class (No timetable entries)
    await db.collection("classes").updateOne(
        { id: CLASS_ID },
        { $set: { id: CLASS_ID, name: "Ad-hoc Verify Class", organizationId: ORG_ID, timetable: [] } },
        { upsert: true }
    );

    // 2. Setup Teacher
    await db.collection("users").updateOne(
        { rfidTag: TEACHER_RFID },
        { $set: { id: "teacher_verify_adhoc", name: "Verifier Teacher", role: "teacher", rfidTag: TEACHER_RFID, organizationId: ORG_ID } },
        { upsert: true }
    );

    // 3. Setup global slot active NOW
    const now = new Date();
    const startH = now.getHours();
    const startM = now.getMinutes();
    const endH = startH + 1;
    const startTimeStr = `${startH.toString().padStart(2, '0')}:${startM.toString().padStart(2, '0')}`;
    const endTimeStr = `${endH.toString().padStart(2, '0')}:${startM.toString().padStart(2, '0')}`;

    await db.collection("college_slots").updateOne(
        { slotNumber: 99 }, // High number for verification
        {
            $set: {
                id: "slot_verify_adhoc",
                slotNumber: 99,
                startTime: startTimeStr,
                endTime: endTimeStr,
                isActive: true,
                type: "class"
            }
        },
        { upsert: true }
    );

    // 4. Setup Device linked to this Class
    await db.collection("devices").updateOne(
        { deviceId: DEVICE_ID },
        { $set: { deviceId: DEVICE_ID, classId: CLASS_ID, organizationId: ORG_ID, room: "Room-Adhoc-Verify", status: "online" } },
        { upsert: true }
    );

    console.log("✅ Data Ready. Connecting to WebSocket...");

    const ws = new WebSocket(SOCKET_URL);

    ws.on('open', () => {
        console.log("[Verification] Connected.");
        ws.send(JSON.stringify({ type: "authenticate", deviceId: DEVICE_ID }));

        setTimeout(() => {
            console.log("\n[Verification] 👨‍🏫 Teacher Scanning...");
            ws.send(JSON.stringify({ type: "rfid_scan", rfidTag: TEACHER_RFID, deviceId: DEVICE_ID }));
        }, 2000);
    });

    ws.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        console.log("[Verification] <- Received:", JSON.stringify(msg, null, 2));

        if (msg.type === "scan_result" && msg.role === "TEACHER") {
            if (msg.status === 201 || msg.status === 202) {
                console.log("\n🎉 SUCCESS: Ad-hoc session created successfully!");
                cleanup(client, CLASS_ID, DEVICE_ID, "slot_verify_adhoc");
            } else {
                console.error("\n❌ FAILURE: Expected 201/202 status, got:", msg.status);
                process.exit(1);
            }
        }
    });

    ws.on('error', (err) => console.error("[Verification] WebSocket Error:", err));
}

async function cleanup(client: MongoClient, classId: string, deviceId: string, slotId: string) {
    console.log("\n🧹 Cleaning up...");
    const db = client.db("attenza");
    await db.collection("classes").deleteOne({ id: classId });
    await db.collection("devices").deleteOne({ deviceId: deviceId });
    await db.collection("college_slots").deleteOne({ id: slotId });
    await client.close();
    console.log("✅ Verification Complete.");
    process.exit(0);
}

runVerification().catch(console.error);
