import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const uri = process.env.MONGODB_URI;
if (!uri) {
    console.error("❌ MONGODB_URI not found in .env.local");
    process.exit(1);
}

const client = new MongoClient(uri);

async function setup() {
    try {
        await client.connect();
        const db = client.db("attenza");

        console.log("🛠️ Setting up Test Data...");

        const users = db.collection("users");
        const devices = db.collection("devices");
        const classes = db.collection("classes");
        const slots = db.collection("college_slots");
        const settings = db.collection("system_settings");

        // 1. Create Organization
        const ORG_ID = "org_sim_001";

        // 2. Create Class
        const CLASS_ID = "class_sim_01";
        await classes.updateOne(
            { id: CLASS_ID },
            { $set: { id: CLASS_ID, name: "Simulation Class", organizationId: ORG_ID } },
            { upsert: true }
        );
        console.log("✅ Class Linked");

        // 3. Create Teacher
        const TEACHER_ID = "teacher_sim_01";
        const TEACHER_RFID = "RFID-TEACHER-SIM";
        await users.updateOne(
            { id: TEACHER_ID },
            {
                $set: {
                    id: TEACHER_ID,
                    name: "Sim Teacher",
                    role: "teacher",
                    rfidTag: TEACHER_RFID,
                    organizationId: ORG_ID,
                    phoneNumber: "919999999999" // Mock phone for whatsapp
                }
            },
            { upsert: true }
        );
        console.log("✅ Teacher Created");

        // 4. Create Student
        const STUDENT_ID = "student_sim_01";
        const STUDENT_RFID = "RFID-STUDENT-SIM";
        await users.updateOne(
            { id: STUDENT_ID },
            {
                $set: {
                    id: STUDENT_ID,
                    name: "Sim Student",
                    role: "student",
                    rfidTag: STUDENT_RFID,
                    classId: CLASS_ID,
                    organizationId: ORG_ID,
                    phoneNumber: "918888888888"
                }
            },
            { upsert: true }
        );
        console.log("✅ Student Created");

        // 5. Create Device
        const DEVICE_ID = "device_sim_01";
        await devices.updateOne(
            { deviceId: DEVICE_ID },
            {
                $set: {
                    deviceId: DEVICE_ID,
                    organizationId: ORG_ID,
                    classId: CLASS_ID,
                    room: "Room-Sim-01",
                    status: "online"
                }
            },
            { upsert: true }
        );
        console.log("✅ Device Created");

        // 6. Create Timetable Slot (For NOW)
        // Ensure there is a slot active RIGHT NOW to allow attendance
        const now = new Date();
        const startH = now.getHours();
        const startM = now.getMinutes();
        // End time 1 hour later
        const endH = startH + 1;

        const startTimeStr = `${startH.toString().padStart(2, '0')}:${startM.toString().padStart(2, '0')}`;
        const endTimeStr = `${endH.toString().padStart(2, '0')}:${startM.toString().padStart(2, '0')}`;
        const dayName = now.toLocaleDateString('en-US', { weekday: 'long' });

        const SLOT_ID = "slot_sim_01";
        await slots.updateOne(
            { id: SLOT_ID },
            {
                $set: {
                    id: SLOT_ID,
                    classId: CLASS_ID,
                    teacherId: TEACHER_ID,
                    subjectName: "Simulation Physics",
                    day: dayName,
                    startTime: startTimeStr,
                    endTime: endTimeStr,
                    organizationId: ORG_ID,
                    isActive: true
                }
            },
            { upsert: true }
        );
        console.log(`✅ Current Slot Created (${startTimeStr} - ${endTimeStr})`);

        console.log("\n🎉 Test Data Ready!");
        console.log("--------------------------------");
        console.log(`Teacher RFID: ${TEACHER_RFID}`);
        console.log(`Student RFID: ${STUDENT_RFID}`);
        console.log(`Device ID:    ${DEVICE_ID}`);
        console.log("--------------------------------");

    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
}

setup();
