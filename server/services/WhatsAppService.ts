import { Client, LocalAuth } from "whatsapp-web.js";
import qrcode from "qrcode-terminal";
import { Collection } from "mongodb";

export class WhatsAppService {
    private client: Client;
    private isReady = false;
    private usersCollection: Collection;

    constructor(usersCollection: Collection) {
        this.usersCollection = usersCollection;

        this.client = new Client({
            authStrategy: new LocalAuth({
                clientId: "attenza-whatsapp" // persists session
            }),
            puppeteer: {
                headless: true,
                args: [
                    "--no-sandbox",
                    "--disable-setuid-sandbox",
                    "--disable-dev-shm-usage",
                    "--disable-gpu"
                ]
            }
        });

        // 🔹 QR CODE (SCAN ONCE)
        this.client.on("qr", (qr) => {
            console.log("📲 Scan this QR to login WhatsApp:");
            qrcode.generate(qr, { small: true });
        });

        // 🔹 READY
        this.client.on("ready", () => {
            console.log("✅ [WhatsApp] Client READY");
            this.isReady = true;
        });

        // 🔹 AUTHENTICATED
        this.client.on("authenticated", () => {
            console.log("🔐 [WhatsApp] Authenticated");
        });

        // 🔹 AUTH FAILURE
        this.client.on("auth_failure", (msg) => {
            console.error("❌ [WhatsApp] Auth failure:", msg);
            this.isReady = false;
        });

        // 🔹 DISCONNECTED
        this.client.on("disconnected", (reason) => {
            console.warn("⚠️ [WhatsApp] Disconnected:", reason);
            this.isReady = false;
        });

        // 🚀 REAL INITIALIZATION (THIS WAS MISSING)
        this.client.initialize();

        console.log("🚀 [WhatsApp] Real service initializing...");
    }

    // ---------------- HELPERS ----------------

    private async getUserPhone(userId: string): Promise<string | undefined> {
        const user = await this.usersCollection.findOne({ id: userId });
        return user?.parentWhatsApp || user?.parentPhone || user?.phoneNumber;
    }

    private formatChatId(phone: string): string {
        if (phone.includes("@c.us")) return phone;

        // Strip non-digits
        let digits = phone.replace(/\D/g, "");

        // Basic Auto-Correction for India (Common issue) | Or generic rule
        // If 10 digits and starts with 6-9, assume India -> add 91
        if (digits.length === 10 && /^[6-9]/.test(digits)) {
            digits = "91" + digits;
        }

        return `${digits}@c.us`;
    }

    // ---------------- MESSAGES ----------------

    /**
     * Internal robust sender to handle the 'markedUnread' error in whatsapp-web.js
     */
    private async safeSend(chatId: string, text: string): Promise<boolean> {
        if (!this.isReady) {
            console.warn("[WhatsApp] Client not ready");
            return false;
        }

        try {
            await this.client.sendMessage(chatId, text);
            console.log(`✅ [WhatsApp] Message sent to ${chatId}`);
            return true;
        } catch (error: any) {
            console.error(`❌ [WhatsApp] Failed to send to ${chatId}:`, error.message);
            // If it's the 'markedUnread' error, message usually sent anyway
            if (error.message && error.message.includes('markedUnread')) {
                console.warn("⚠️ [WhatsApp] Caught 'markedUnread' error, treating as success.");
                return true;
            }
            return false;
        }
    }

    public async sendTeacherArrivalAlert(
        teacherName: string,
        subject: string,
        targetUserId: string
    ) {
        const phone = await this.getUserPhone(targetUserId);
        if (!phone) {
            console.warn(`[WhatsApp] No phone for teacher ${targetUserId}`);
            return;
        }

        const chatId = this.formatChatId(phone);
        const tName = teacherName.trim();
        const sub = subject.trim();
        const now = new Date();
        const time = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
        const day = now.toLocaleDateString('en-IN', { weekday: 'long' });

        const message =
            `🔔 *TEACHER CHECKED IN*\n\n` +
            `📅 *Day:* ${day}\n` +
            `👩‍🏫 *Teacher:* ${tName}\n` +
            `📘 *Subject:* ${sub}\n` +
            `⏰ *Time:* ${time}\n\n` +
            `👉 _Class has started. Please take your seats._`;

        await this.safeSend(chatId, message);
    }

    public async sendBreakWarning(minsLeft: number, targetUserId: string) {
        const phone = await this.getUserPhone(targetUserId);
        if (!phone) return;

        const chatId = this.formatChatId(phone);
        const message =
            `🔔 *BREAK ENDING SOON*\n\n` +
            `⏳ *Next Class:* Starts in ${minsLeft} minutes\n\n` +
            `👉 _Please make your way back to class._`;

        await this.safeSend(chatId, message);
    }

    public async sendUserMessage(userId: string, text: string): Promise<boolean> {
        const phone = await this.getUserPhone(userId);
        if (!phone) {
            console.warn(`[WhatsApp] No phone found for user ${userId}`);
            return false;
        }
        const chatId = this.formatChatId(phone);
        return await this.safeSend(chatId, text);
    }

    public async sendDirectMessage(phoneIndex: string, text: string): Promise<boolean> {
        const chatId = this.formatChatId(phoneIndex);
        return await this.safeSend(chatId, text);
    }
}
