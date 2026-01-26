import { Collection } from "mongodb";

export interface SystemSettings {
    earlyAccessWindowMins: number;
    postClassFreeAccessHours: number;
    operatingStartHour: number;
    operatingEndHour: number;
    teacherGraceMins: number;
    studentFirstSlotWindowMins: number;
    studentRegularWindowMins: number;
    reVerificationGraceMins: number;
    breakWarningMins: number;
}

export class SystemConfigService {
    private settings: SystemSettings = {
        earlyAccessWindowMins: 30,
        postClassFreeAccessHours: 2,
        operatingStartHour: 7,
        operatingEndHour: 18,
        teacherGraceMins: 15,
        studentFirstSlotWindowMins: 30,
        studentRegularWindowMins: 5,
        reVerificationGraceMins: 3,
        breakWarningMins: 3,
    };

    constructor(private settingsCollection: Collection) { }

    /**
     * Load settings from database or initialize with defaults
     */
    public async initialize() {
        const dbSettings = await this.settingsCollection.findOne({ type: "global_config" });
        if (dbSettings) {
            this.settings = { ...this.settings, ...dbSettings };
            console.log("[SystemConfig] Settings loaded from DB");
        } else {
            console.log("[SystemConfig] No settings found in DB, using defaults");
            await this.settingsCollection.updateOne(
                { type: "global_config" },
                { $set: { ...this.settings, type: "global_config", updatedAt: new Date() } },
                { upsert: true }
            );
        }
    }

    /**
     * Refresh settings from DB
     */
    public async refresh() {
        const dbSettings = await this.settingsCollection.findOne({ type: "global_config" });
        if (dbSettings) {
            // Remove MongoDB internal _id if present
            const { _id, ...rest } = dbSettings as any;
            this.settings = { ...this.settings, ...rest };
        }
    }

    public getSettings(): SystemSettings {
        return { ...this.settings };
    }

    public async updateSettings(updates: Partial<SystemSettings>) {
        this.settings = { ...this.settings, ...updates };
        await this.settingsCollection.updateOne(
            { type: "global_config" },
            { $set: { ...updates, updatedAt: new Date() } }
        );
        console.log("[SystemConfig] Settings updated");
    }
}
