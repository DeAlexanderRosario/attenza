import makeWASocket, {
    DisconnectReason,
    useMultiFileAuthState,
    makeCacheableSignalKeyStore,
    ConnectionState,
    WAConnectionState,
    fetchLatestBaileysVersion
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import pino from "pino";
import qrcode from "qrcode-terminal";
import { Collection } from "mongodb";
import path from "path";
import fs from "fs";

export class WhatsAppService {
    private sock: any;
    private isReady = false;
    private usersCollection: Collection;
    private logger = pino({ level: "warn" });

    constructor(usersCollection: Collection) {
        this.usersCollection = usersCollection;
        this.initializeBaileys();
    }

    private async initializeBaileys() {
        console.log("🚀 [WhatsApp] Starting Baileys Service...");

        // 1. Fetch Latest WA Version (Crucial for avoiding 405)
        const { version, isLatest } = await fetchLatestBaileysVersion();
        console.log(`[WhatsApp] Using version: ${version.join('.')} (Latest: ${isLatest})`);

        // 2. Load Auth State
        const { state, saveCreds } = await useMultiFileAuthState("auth_info_baileys");

        const hasCreds = !!(state.creds && state.creds.me);
        console.log(`[WhatsApp] Auth State: ${hasCreds ? 'Logged In (' + (state.creds.me?.id || "Unknown") + ')' : 'No Session (QR required)'}`);

        this.sock = makeWASocket({
            version,
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, this.logger),
            },
            logger: this.logger,
            browser: ["TrueCheck", "Chrome", "11.0.0"],
            syncFullHistory: false,
            defaultQueryTimeoutMs: undefined,
            connectTimeoutMs: 60000,
            retryRequestDelayMs: 5000
        });

        this.sock.ev.on("creds.update", saveCreds);

        this.sock.ev.on("connection.update", async (update: Partial<ConnectionState>) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                console.log("\n==========================================");
                console.log("📲 NEW WHATSAPP QR CODE GENERATED:");
                console.log("👉 Scan this in WhatsApp -> Linked Devices");
                console.log("==========================================\n");
                qrcode.generate(qr, { small: true });
            }

            if (connection === "close") {
                const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
                const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

                console.warn(`⚠️ [WhatsApp] Connection closed (Status: ${statusCode}). Reconnecting: ${shouldReconnect}`);
                this.isReady = false;

                if (statusCode === 405 || statusCode === 401) {
                    console.error(`🚨 [WhatsApp] CRITICAL ERROR ${statusCode}: Session corrupted or rejected.`);
                    console.error("👉 ACTION: Clearing session and waiting for fresh state...");

                    try {
                        if (this.sock) {
                            this.sock.ev.removeAllListeners("connection.update");
                            this.sock.ev.removeAllListeners("creds.update");
                            this.sock.ws?.close();
                            this.sock = null;
                        }

                        const authPath = path.join(process.cwd(), "auth_info_baileys");
                        if (fs.existsSync(authPath)) {
                            // Windows File Lock Fix: Wait longer and force delete
                            await new Promise(resolve => setTimeout(resolve, 8000));
                            fs.rmSync(authPath, { recursive: true, force: true });
                            console.log("✅ [WhatsApp] Session folder cleared.");
                        }
                    } catch (err: any) {
                        console.error("[WhatsApp] Cleanup failed (folder may be locked):", err.message);
                    }
                }

                if (shouldReconnect) {
                    const delay = (statusCode === 405 || statusCode === 401) ? 20000 : 5000;
                    console.log(`[WhatsApp] Re-initializing in ${delay / 1000}s...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    this.initializeBaileys();
                }
            } else if (connection === "open") {
                console.log("✅ [WhatsApp] Baileys Client READY");
                this.isReady = true;
            }
        });
    }

    // ---------------- HELPERS ----------------

    private async getUserPhone(userId: string): Promise<string | undefined> {
        const user = await this.usersCollection.findOne({ id: userId });
        return user?.parentWhatsApp || user?.parentPhone || user?.phoneNumber;
    }

    private formatChatId(phone: string): string {
        if (phone.includes("@s.whatsapp.net")) return phone;

        // Strip non-digits
        let digits = phone.replace(/\D/g, "");

        // Basic Auto-Correction for India (Common issue)
        if (digits.length === 10 && /^[6-9]/.test(digits)) {
            digits = "91" + digits;
        }

        return `${digits}@s.whatsapp.net`;
    }

    // ---------------- MESSAGES ----------------

    private async safeSend(chatId: string, text: string): Promise<boolean> {
        if (!this.isReady || !this.sock) {
            console.warn("[WhatsApp] Client not ready or socket missing");
            return false;
        }

        try {
            console.log(`[WhatsApp] Sending message to ${chatId}...`);
            await this.sock.sendMessage(chatId, { text });
            console.log(`✅ [WhatsApp] Message sent to ${chatId}`);
            return true;
        } catch (error: any) {
            console.error(`❌ [WhatsApp] Hard failure sending to ${chatId}:`, error.message || error);
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
        const sub = (subject || "Class").trim();
        const now = new Date();
        const time = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
        const day = now.toLocaleDateString('en-IN', { weekday: 'long' });

        const message =
            `🚀 *TrueCheck Class Alert* 🚀\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `🎓 *CLASS IS STARTING NOW* 🎓\n\n` +
            `📘 *Subject:* ${sub}\n` +
            `👩‍🏫 *Teacher:* ${tName}\n` +
            `⏰ *Time:* ${time}\n` +
            `📅 *Day:* ${day}\n\n` +
            `👉 _Class has officially started. Please take your seats._\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `✨ _Have a great learning session!_`;

        await this.safeSend(chatId, message);
    }

    public async sendBreakWarning(minsLeft: number, targetUserId: string) {
        const phone = await this.getUserPhone(targetUserId);
        if (!phone) return;

        const chatId = this.formatChatId(phone);
        const message =
            `⏳ *TrueCheck Time Alert* ⏳\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `🎓 *NEXT CLASS STARTING SOON* 🎓\n\n` +
            `🏃‍♂️ Your next session starts in *${minsLeft} minutes*.\n\n` +
            `📍 *Action:* Since you are already in the classroom, please be ready to scan your ID on the *Inside Unit* as soon as the teacher arrives to mark your attendance!\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `_Stay punctual, stay ahead!_ 🚀`;

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
