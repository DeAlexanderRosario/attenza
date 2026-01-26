import { SystemMode, ModeTransitionEvent, AttendanceState } from "../types";
import { SlotService } from "./SlotService";
import { StateManager } from "./StateManager";
import { SystemConfigService } from "./SystemConfigService";
import { Server } from "socket.io";

/**
 * ModeManager - Centralized System Mode Management
 */
export class ModeManager {
    private currentMode: SystemMode = SystemMode.CLOSED;
    private modeHistory: ModeTransitionEvent[] = [];
    private lastModeCheck: Date = new Date();

    constructor(
        private slotService: SlotService,
        private configService: SystemConfigService,
        private io?: Server,
        private stateManager?: StateManager,
    ) {
        console.log("[ModeManager] Initialized");
    }

    /**
     * Setter for StateManager (since it's created after ModeManager)
     */
    public setStateManager(stateManager: StateManager) {
        this.stateManager = stateManager;
        console.log("[ModeManager] StateManager linked");
    }

    /**
     * Synchronize StateManager with current active slot (mostly for BREAKs)
     */
    private async syncStateManager(activeSlot: any, now: Date) {
        if (!this.stateManager) return;

        // Apply normalization (centralized logic)
        const room = StateManager.normalizeRoom("Room-CSE-1");

        const existing = this.stateManager.getSlotState(room);

        // If it's a break and not initialized in StateManager, do it now
        if (activeSlot.type === "break" && (!existing || existing.slotId !== activeSlot.id)) {
            console.log(`[ModeManager] Auto-initializing BREAK slot in StateManager for ${room}`);

            const [startH, startM] = activeSlot.startTime.split(':').map(Number);
            const startTime = new Date(now);
            startTime.setHours(startH, startM, 0, 0);

            const [endH, endM] = activeSlot.endTime.split(':').map(Number);
            const endTime = new Date(now);
            endTime.setHours(endH, endM, 0, 0);

            this.stateManager.initializeSlot(
                activeSlot.id,
                room,
                startTime,
                endTime,
                "SYSTEM", // No specific teacher for break
                activeSlot.label || "Break",
                undefined, // No classId
                undefined, // No sessionId initially
                undefined, // organizationId
                undefined, // subjectCode
                AttendanceState.BREAK
            );
        }
    }

    /**
     * Get current system mode
     */
    public getCurrentMode(): SystemMode {
        return this.currentMode;
    }

    /**
     * Get mode history
     */
    public getModeHistory(): ModeTransitionEvent[] {
        return [...this.modeHistory];
    }

    /**
     * Transition to a new mode
     */
    public async transitionToMode(
        newMode: SystemMode,
        reason: string,
        triggeredBy: string = "auto"
    ): Promise<void> {
        if (this.currentMode === newMode) {
            console.log(`[ModeManager] Already in ${newMode} mode`);
            return;
        }

        const event: ModeTransitionEvent = {
            fromMode: this.currentMode,
            toMode: newMode,
            timestamp: new Date(),
            reason,
            triggeredBy
        };

        console.log(`[ModeManager] Transition: ${this.currentMode} → ${newMode} (${reason})`);

        this.currentMode = newMode;
        this.modeHistory.push(event);

        // Emit event to connected clients
        if (this.io) {
            this.io.emit("mode_changed", {
                mode: newMode,
                timestamp: event.timestamp,
                reason
            });
        }
    }

    /**
     * Check if an action is allowed in the current mode
     */
    public canPerformAction(action: string): { allowed: boolean; reason?: string } {
        switch (action) {
            case "student_entry":
                if (this.currentMode === SystemMode.CLOSED) {
                    return { allowed: false, reason: "Classroom is closed" };
                }
                return { allowed: true };

            case "teacher_checkin":
                if (this.currentMode === SystemMode.CLOSED) {
                    return { allowed: false, reason: "Classroom is closed" };
                }
                if (this.currentMode === SystemMode.POST_CLASS_FREE_ACCESS) {
                    return { allowed: false, reason: "No scheduled classes" };
                }
                return { allowed: true };

            case "create_attendance":
                if (this.currentMode !== SystemMode.SLOT_ACTIVE) {
                    return { allowed: false, reason: "Attendance only during active slots" };
                }
                return { allowed: true };

            case "movement_tracking":
                if (this.currentMode === SystemMode.CLOSED) {
                    return { allowed: false, reason: "Classroom is closed" };
                }
                return { allowed: true };

            default:
                return { allowed: false, reason: "Unknown action" };
        }
    }

    /**
     * Auto-check for mode transitions (called every minute)
     */
    public async checkModeTransitions(now: Date = new Date()): Promise<void> {
        const currentHour = now.getHours();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();

        console.log(`[ModeManager] Checking transitions at ${now.toLocaleTimeString('en-IN')} (${currentMinutes} mins)`);

        const settings = this.configService.getSettings();

        // 1. Check if outside operating hours
        if (currentHour < settings.operatingStartHour || currentHour >= settings.operatingEndHour) {
            console.log(`[ModeManager] DEBUG: Outside operating hours (${currentHour})`);
            if (this.currentMode !== SystemMode.CLOSED) {
                await this.transitionToMode(SystemMode.CLOSED, "Outside operating hours");

                // RESET: Clear all in-room status for a new day
                if (this.stateManager) {
                    console.log(`[ModeManager] Operating hours ended. Clearing all student statuses for tomorrow.`);
                    await this.stateManager.clearInRoomStatus();
                }
            }
            return;
        }

        // 2. Get slot information
        console.log(`[ModeManager] DEBUG: Fetching slots...`);
        const firstSlot = await this.slotService.getFirstSlotOfDay();
        const lastSlot = await this.slotService.getLastSlotOfDay();
        const activeSlot = await this.slotService.getActivePeriod(now);

        // SYNC StateManager if there is an active slot (especially for breaks)
        if (activeSlot) {
            await this.syncStateManager(activeSlot, now);
        }

        // 3. Check for EARLY_ACCESS_FIRST_SLOT
        if (firstSlot) {
            const [startH, startM] = firstSlot.startTime.split(':').map(Number);
            const slotStartMinutes = startH * 60 + startM;
            const earlyAccessStart = slotStartMinutes - settings.earlyAccessWindowMins;

            if (currentMinutes >= earlyAccessStart && currentMinutes < slotStartMinutes) {
                console.log(`[ModeManager] DEBUG: In Early Access Window for ${firstSlot.label}`);
                if (this.currentMode !== SystemMode.EARLY_ACCESS_FIRST_SLOT) {
                    await this.transitionToMode(
                        SystemMode.EARLY_ACCESS_FIRST_SLOT,
                        `Early access window for first slot (${firstSlot.label})`
                    );
                }
                return;
            }
        }

        // 4. Check for SLOT_ACTIVE or BREAK
        if (activeSlot) {
            const targetMode = activeSlot.type === "break" ? SystemMode.BREAK : SystemMode.SLOT_ACTIVE;
            console.log(`[ModeManager] DEBUG: Active slot found. Target mode: ${targetMode}`);
            if (this.currentMode !== targetMode) {
                await this.transitionToMode(targetMode, `Active period: ${activeSlot.label}`);
            }
            return;
        }

        // 5. Check for POST_CLASS_FREE_ACCESS
        if (lastSlot) {
            const [endH, endM] = lastSlot.endTime.split(':').map(Number);
            const slotEndMinutes = endH * 60 + endM;
            const freeAccessEnd = slotEndMinutes + (settings.postClassFreeAccessHours * 60);

            if (currentMinutes >= slotEndMinutes && currentMinutes < freeAccessEnd) {
                console.log(`[ModeManager] DEBUG: In Post-Class Free Access Period`);
                if (this.currentMode !== SystemMode.POST_CLASS_FREE_ACCESS) {
                    await this.transitionToMode(
                        SystemMode.POST_CLASS_FREE_ACCESS,
                        "Post-class free access period"
                    );
                }
                return;
            }

            // After free access period, close
            if (currentMinutes >= freeAccessEnd) {
                console.log(`[ModeManager] DEBUG: Free access period ended. Closing.`);
                if (this.currentMode !== SystemMode.CLOSED) {
                    await this.transitionToMode(SystemMode.CLOSED, "Free access period ended");
                }
                return;
            }
        }

        // 6. Default: Inside operating hours but no specific event
        console.log(`[ModeManager] DEBUG: Falling back to IDLE or Re-opening`);
        if (this.currentMode !== SystemMode.IDLE) {
            await this.transitionToMode(SystemMode.IDLE, "No active slot or break during operating hours");
        }

        this.lastModeCheck = now;
    }

    /**
     * Force mode transition (for teacher arrival, etc.)
     */
    public async forceMode(mode: SystemMode, reason: string, triggeredBy: string): Promise<void> {
        await this.transitionToMode(mode, reason, triggeredBy);
    }

    /**
     * Check if currently in early access window
     */
    public async isEarlyAccessWindow(now: Date = new Date()): Promise<boolean> {
        const firstSlot = await this.slotService.getFirstSlotOfDay();
        if (!firstSlot) return false;

        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        const [startH, startM] = firstSlot.startTime.split(':').map(Number);
        const slotStartMinutes = startH * 60 + startM;
        const earlyAccessStart = slotStartMinutes - this.configService.getSettings().earlyAccessWindowMins;

        return currentMinutes >= earlyAccessStart && currentMinutes < slotStartMinutes;
    }

    /**
     * Check if currently in post-class free access
     */
    public async isPostClassFreeAccess(now: Date = new Date()): Promise<boolean> {
        const lastSlot = await this.slotService.getLastSlotOfDay();
        if (!lastSlot) return false;

        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        const [endH, endM] = lastSlot.endTime.split(':').map(Number);
        const slotEndMinutes = endH * 60 + endM;

        return currentMinutes >= slotEndMinutes;
    }

    /**
     * Get time until next mode transition
     */
    public async getNextTransition(): Promise<{ mode: SystemMode; at: Date } | null> {
        const now = new Date();
        const firstSlot = await this.slotService.getFirstSlotOfDay();
        const lastSlot = await this.slotService.getLastSlotOfDay();

        const settings = this.configService.getSettings();
        if (firstSlot) {
            const [startH, startM] = firstSlot.startTime.split(':').map(Number);
            const earlyAccessTime = new Date(now);
            earlyAccessTime.setHours(startH, startM - settings.earlyAccessWindowMins, 0, 0);

            if (now < earlyAccessTime) {
                return { mode: SystemMode.EARLY_ACCESS_FIRST_SLOT, at: earlyAccessTime };
            }
        }

        if (lastSlot) {
            const [endH, endM] = lastSlot.endTime.split(':').map(Number);
            const freeAccessTime = new Date(now);
            freeAccessTime.setHours(endH, endM, 0, 0);

            if (now < freeAccessTime) {
                return { mode: SystemMode.POST_CLASS_FREE_ACCESS, at: freeAccessTime };
            }
        }

        return null;
    }
}
