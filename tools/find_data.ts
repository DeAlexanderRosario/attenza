import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const uri = process.env.MONGODB_URI;
if (!uri) {
    console.error("❌ MONGODB_URI not found");
    process.exit(1);
}

const client = new MongoClient(uri);

async function findData() {
    try {
        await client.connect();
        const db = client.db("attenza");

        console.log("🔍 Searching for Existing Data...");

        const devices = await db.collection("devices").find({}).limit(5).toArray();
        const teachers = await db.collection("users").find({ role: "teacher" }).limit(5).toArray();
        const students = await db.collection("users").find({ role: "student" }).limit(5).toArray();

        console.log("\n📡 DEVICES Found:");
        devices.forEach(d => console.log(` - ID: ${d.deviceId}, Class: ${d.classId}, Org: ${d.organizationId}`));

        console.log("\n👨‍🏫 TEACHERS Found:");
        teachers.forEach(t => console.log(` - Name: ${t.name}, RFID: ${t.rfidTag}, ID: ${t.id}`));

        console.log("\n👨‍🎓 STUDENTS Found:");
        students.forEach(s => console.log(` - Name: ${s.name}, RFID: ${s.rfidTag}, Class: ${s.classId}`));

    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
}

findData();
