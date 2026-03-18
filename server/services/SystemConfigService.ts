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
        operatingEndHour: 21,
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
            // Merge defaults with DB settings to ensure all keys exist
            this.settings = {
                ...this.settings,
                ...dbSettings
            };

            // Remove internal mongo _id if it leaked into our settings object
            if ((this.settings as any)._id) delete (this.settings as any)._id;

            // Perform a full sync back to DB to ensure all production defaults are present
            console.log("[SystemConfig] Syncing production defaults to database...");
            await this.settingsCollection.updateOne(
                { type: "global_config" },
                {
                    $set: {
                        ...this.settings,
                        updatedAt: new Date()
                    }
                }
            );
            console.log(`[SystemConfig] Ready. System closes at: ${this.settings.operatingEndHour}:00`);
        } else {
            console.log("[SystemConfig] No settings found in DB, initializing with defaults...");
            await this.settingsCollection.updateOne(
                { type: "global_config" },
                {
                    $set: {
                        ...this.settings,
                        type: "global_config",
                        updatedAt: new Date()
                    }
                },
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
