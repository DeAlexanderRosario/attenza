import WebSocket from 'ws';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SOCKET_URL = "ws://localhost:3003/ws";
const MONGODB_URI = process.env.MONGODB_URI;

async function runFinalVerification() {
    if (!MONGODB_URI) {
        console.error("❌ MONGODB_URI not found");
        process.exit(1);
    }

    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db("attenza");

    console.log("🛠️ Preparing Final Verification Data...");

    const ORG_ID = "org_final_verify";
    const CLASS_ID = "class_final_verify";
    const TEACHER_RFID = "RFID-FINAL-TEACHER";
    const STUDENT_RFID = "RFID-FINAL-STUDENT";
    const DEVICE_ID = "device_final_verify";

    // 1. Setup Class
    await db.collection("classes").updateOne(
        { id: CLASS_ID },
        { $set: { id: CLASS_ID, name: "Final Verify Class", organizationId: ORG_ID, timetable: [] } },
        { upsert: true }
    );

    // 2. Setup Teacher
    await db.collection("users").updateOne(
        { rfidTag: TEACHER_RFID },
        { $set: { id: "teacher_final", name: "Final Teacher", role: "teacher", rfidTag: TEACHER_RFID, organizationId: ORG_ID } },
        { upsert: true }
    );

    // 3. Setup Student
    await db.collection("users").updateOne(
        { rfidTag: STUDENT_RFID },
        { $set: { id: "student_final", name: "Final Student", role: "student", rfidTag: STUDENT_RFID, classId: CLASS_ID, organizationId: ORG_ID } },
        { upsert: true }
    );

    // 4. Setup global slot active NOW
    const now = new Date();
    const startH = now.getHours();
    const startM = now.getMinutes();
    const endH = startH + 1;
    const startTimeStr = `${startH.toString().padStart(2, '0')}:${startM.toString().padStart(2, '0')}`;
    const endTimeStr = `${endH.toString().padStart(2, '0')}:${startM.toString().padStart(2, '0')}`;

    await db.collection("college_slots").updateOne(
        { slotNumber: 100 },
        {
            $set: {
                id: "slot_final_verify",
                slotNumber: 100,
                startTime: startTimeStr,
                endTime: endTimeStr,
                isActive: true,
                type: "class"
            }
        },
        { upsert: true }
    );

    // 5. Setup Device linked to this Class
    await db.collection("devices").updateOne(
        { deviceId: DEVICE_ID },
        { $set: { deviceId: DEVICE_ID, classId: CLASS_ID, organizationId: ORG_ID, room: "Room-Final-Verify", status: "online" } },
        { upsert: true }
    );

    console.log("✅ Data Ready. Connecting to WebSocket...");

    const ws = new WebSocket(SOCKET_URL);

    ws.on('open', () => {
        console.log("[Ver] Connected.");
        ws.send(JSON.stringify({ type: "authenticate", deviceId: DEVICE_ID }));

        // Teacher Scan
        setTimeout(() => {
            console.log("\n[Ver] 👨‍🏫 Teacher Scanning...");
            ws.send(JSON.stringify({ type: "rfid_scan", rfidTag: TEACHER_RFID, deviceId: DEVICE_ID }));
        }, 2000);

        // Student Scan
        setTimeout(() => {
            console.log("\n[Ver] 👨‍🎓 Student Scanning...");
            ws.send(JSON.stringify({ type: "rfid_scan", rfidTag: STUDENT_RFID, deviceId: DEVICE_ID }));
        }, 4000);
    });

    ws.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        console.log("[Ver] <- Received:", JSON.stringify(msg, null, 2));

        if (msg.type === "scan_result") {
            console.log(`[Ver] Verification: Status=${msg.status}, User=${msg.user?.name}, Role=${msg.role}`);

            if (msg.role === "STUDENT" && msg.status === 200) {
                console.log("\n🎉 ALL TESTS PASSED: Standardized 2-Way Payload Verified!");
                cleanup(client, CLASS_ID, DEVICE_ID, ["slot_final_verify"]);
            }
        }
    });

    ws.on('error', (err) => console.error("[Ver] WebSocket Error:", err));
}

async function cleanup(client: MongoClient, classId: string, deviceId: string, slotIds: string[]) {
    console.log("\n🧹 Cleaning up...");
    const db = client.db("attenza");
    await db.collection("classes").deleteOne({ id: classId });
    await db.collection("devices").deleteOne({ deviceId: deviceId });
    for (const id of slotIds) {
        await db.collection("college_slots").deleteOne({ id });
    }
    await client.close();
    console.log("✅ Final Verification Complete.");
    process.exit(0);
}

runFinalVerification().catch(console.error);
