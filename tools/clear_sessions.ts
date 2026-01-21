import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const uri = process.env.MONGODB_URI;
if (!uri) process.exit(1);

const client = new MongoClient(uri);

async function clear() {
    try {
        await client.connect();
        const db = client.db("attenza");

        // Clear sessions for the test room
        // The error said "Room-CSE-1"
        const result = await db.collection("active_sessions").deleteMany({
            room: "Room-CSE-1"
        });

        console.log(`Cleared ${result.deletedCount} active sessions for Room-CSE-1.`);

    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
}

clear();
