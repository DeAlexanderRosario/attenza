import { Collection } from "mongodb";
import { TimeSlotConfig } from "../types";
import { SystemConfigService } from "./SystemConfigService";

export class SlotService {
    constructor(
        private slotsCollection: Collection, // college_slots
        private settingsCollection: Collection,
        private classesCollection: Collection, // classes collection
        private configService: SystemConfigService
    ) { }

    /**
     * Finds the currently active time slot configuration (e.g., "Period 1: 9:00-10:00")
     */
    public async getActivePeriod(now: Date): Promise<TimeSlotConfig | null> {
        // Fetch ALL slots from 'college_slots'
        const slots = await this.slotsCollection.find({ isActive: true }).toArray();
        if (!slots || slots.length === 0) return null;

        const currentMinutes = now.getHours() * 60 + now.getMinutes();

        // Helper to parse "HH:mm" to minutes
        const toMinutes = (timeStr: string) => {
            if (!timeStr) return -1;
            const [h, m] = timeStr.split(':').map(Number);
            return h * 60 + m;
        };

        console.log(`[SlotService] Checking ${slots.length} slots for time ${now.toLocaleTimeString('en-IN')} (${currentMinutes} mins)`);

        const activeSlot = slots.find((s: any) => {
            const start = toMinutes(s.startTime);
            const end = toMinutes(s.endTime);
            const match = currentMinutes >= start && currentMinutes < end;
            if (match) console.log(`[SlotService] Match found: ${s.startTime} - ${s.endTime}`);
            return match;
        });

        if (!activeSlot) {
            console.log(`[SlotService] No matching slot found for current time.`);
            return null;
        }

        return {
            id: activeSlot.id,
            startTime: activeSlot.startTime,
            endTime: activeSlot.endTime,
            type: activeSlot.type.toLowerCase() as "class" | "break",
            label: `Slot ${activeSlot.slotNumber}`
        };
    }

    /**
     * Finds the specific academic subject slot for a user at this time
     */
    public async getAcademicSlot(user: any, activePeriod: TimeSlotConfig, now: Date) {
        const todayDay = now.toLocaleDateString('en-IN', { weekday: 'long' });

        // Query the class document
        const classDoc = await this.classesCollection.findOne({ id: user.classId });
        if (!classDoc || !classDoc.timetable) return null;

        // 1. Try to find the entry for this specific day/slot
        let entry = classDoc.timetable.find((e: any) =>
            String(e.classSlotId) === String(activePeriod.id) &&
            e.dayOfWeek === todayDay
        );

        // 2. FALLBACK: Find ANY entry for this slot (ignoring day)
        if (!entry) {
            console.log(`[SlotService] getAcademicSlot: No scheduled class for ${user.classId} on ${todayDay}. Trying fallback...`);
            entry = classDoc.timetable.find((e: any) =>
                String(e.classSlotId) === String(activePeriod.id)
            );
        }

        return entry;
    }

    public async getSlotById(slotId: string) {
        // Try as string and number
        const idNum = parseInt(slotId, 10);
        const query = isNaN(idNum) ? { id: slotId } : { $or: [{ id: slotId }, { id: idNum }] };
        return await this.slotsCollection.findOne(query);
    }

    /**
     * Finds the scheduled class for a teacher at a specific time (with 15-min lookahead).
     */
    public async getCurrentTeacherSlot(teacherId: string, now: Date) {
        const currentMinutes = now.getHours() * 60 + now.getMinutes();

        // 1. Try to find a slot active RIGHT NOW
        const activePeriod = await this.getActivePeriod(now);

        const settings = this.configService.getSettings();
        // 2. If no active period, look ahead
        let targetPeriod = activePeriod;
        if (!targetPeriod) {
            const lookaheadTime = new Date(now.getTime() + settings.teacherGraceMins * 60000);
            targetPeriod = await this.getActivePeriod(lookaheadTime);
        }

        if (!targetPeriod) return null;

        const currentDay = now.toLocaleDateString('en-IN', { weekday: 'long' });
        const slotIdStr = String(targetPeriod.id);
        const slotIdNum = parseInt(slotIdStr, 10);

        // 3. Find any class that has this teacher assigned to this slot/day
        // We search with BOTH string and number versions of the slot ID to be safe
        let classDoc = await this.classesCollection.findOne({
            "timetable": {
                $elemMatch: {
                    teacherId: teacherId,
                    dayOfWeek: currentDay,
                    classSlotId: isNaN(slotIdNum) ? slotIdStr : { $in: [slotIdStr, slotIdNum] }
                }
            }
        });

        // 4. FALLBACK: If no match for today, look for this teacher's classes in this slot on ANY day
        if (!classDoc) {
            console.log(`[SlotService] No scheduled class for ${teacherId} on ${currentDay}. Trying fallback...`);
            classDoc = await this.classesCollection.findOne({
                "timetable": {
                    $elemMatch: {
                        teacherId: teacherId,
                        classSlotId: isNaN(slotIdNum) ? slotIdStr : { $in: [slotIdStr, slotIdNum] }
                    }
                }
            });
        }

        if (!classDoc || !classDoc.timetable) return null;

        // Find the specific entry
        // First try today's day
        let entry = classDoc.timetable.find((e: any) =>
            e.teacherId === teacherId &&
            e.dayOfWeek === currentDay &&
            String(e.classSlotId) === slotIdStr
        );

        // Then fallback to ANY entry for this teacher/slot
        if (!entry) {
            entry = classDoc.timetable.find((e: any) =>
                e.teacherId === teacherId &&
                String(e.classSlotId) === slotIdStr
            );
        }

        return entry ? {
            ...entry,
            classId: classDoc.id,
            startTime: targetPeriod.startTime,
            endTime: targetPeriod.endTime
        } : null;
    }

    /**
     * Finds the scheduled class for a specific Class ID at this time.
     */
    public async getCurrentClassSlot(classId: string, now: Date) {
        const activePeriod = await this.getActivePeriod(now);
        if (!activePeriod) return null;

        const currentDay = now.toLocaleDateString('en-IN', { weekday: 'long' });
        const slotIdStr = String(activePeriod.id);

        // Query the class document
        const classDoc = await this.classesCollection.findOne({ id: classId });
        if (!classDoc || !classDoc.timetable) return null;

        // 1. Try to find the entry for this specific day/slot
        let entry = classDoc.timetable.find((e: any) =>
            String(e.classSlotId) === slotIdStr &&
            e.dayOfWeek === currentDay
        );

        // 2. FALLBACK: Find ANY entry for this slot (ignoring day)
        if (!entry) {
            console.log(`[SlotService] No scheduled class for ${classId} on ${currentDay}. Trying fallback...`);
            entry = classDoc.timetable.find((e: any) =>
                String(e.classSlotId) === slotIdStr
            );

            if (entry) {
                console.log(`[SlotService] Found fallback class for ${classId} (Day mismatch ignored)`);
            }
        }

        return entry ? {
            ...entry,
            classId: classDoc.id,
            startTime: activePeriod.startTime,
            endTime: activePeriod.endTime
        } : null;
    }

    /**
     * Checks if a slot is the first academic slot of the day.
     */
    public async isFirstSlotOfToday(slotId: string): Promise<boolean> {
        const slots = await this.slotsCollection.find({ isActive: true, type: { $regex: /class/i } }).toArray();
        if (!slots || slots.length === 0) return false;

        // Find the slot with the earliest start time
        const toMinutes = (timeStr: string) => {
            if (!timeStr) return 9999;
            const [h, m] = timeStr.split(':').map(Number);
            return h * 60 + m;
        };

        const sortedSlots = slots.sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));
        const firstSlot = sortedSlots[0];

        return firstSlot.id === slotId;
    }

    /**
     * Get the first academic slot of the day
     */
    public async getFirstSlotOfDay(): Promise<TimeSlotConfig | null> {
        const slots = await this.slotsCollection.find({
            isActive: true,
            type: { $regex: /class/i }
        }).toArray();

        if (!slots || slots.length === 0) return null;

        const toMinutes = (timeStr: string) => {
            if (!timeStr) return 9999;
            const [h, m] = timeStr.split(':').map(Number);
            return h * 60 + m;
        };

        const sortedSlots = slots.sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));
        const firstSlot = sortedSlots[0];

        return {
            id: firstSlot.id,
            startTime: firstSlot.startTime,
            endTime: firstSlot.endTime,
            type: "class",
            label: firstSlot.label || `Slot ${firstSlot.slotNumber}`,
            slotNumber: firstSlot.slotNumber,
            isActive: firstSlot.isActive
        };
    }

    /**
     * Get the last academic slot of the day
     */
    public async getLastSlotOfDay(): Promise<TimeSlotConfig | null> {
        const slots = await this.slotsCollection.find({
            isActive: true,
            type: { $regex: /class/i }
        }).toArray();

        if (!slots || slots.length === 0) return null;

        const toMinutes = (timeStr: string) => {
            if (!timeStr) return -1;
            const [h, m] = timeStr.split(':').map(Number);
            return h * 60 + m;
        };

        const sortedSlots = slots.sort((a, b) => toMinutes(b.endTime) - toMinutes(a.endTime));
        const lastSlot = sortedSlots[0];

        return {
            id: lastSlot.id,
            startTime: lastSlot.startTime,
            endTime: lastSlot.endTime,
            type: "class",
            label: lastSlot.label || `Slot ${lastSlot.slotNumber}`,
            slotNumber: lastSlot.slotNumber,
            isActive: lastSlot.isActive
        };
    }

    /**
     * Check if current time is in early access window (30 min before first slot)
     */
    public async isEarlyAccessWindow(now: Date): Promise<boolean> {
        const firstSlot = await this.getFirstSlotOfDay();
        if (!firstSlot) return false;

        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        const [startH, startM] = firstSlot.startTime.split(':').map(Number);
        const slotStartMinutes = startH * 60 + startM;
        const earlyAccessStart = slotStartMinutes - this.configService.getSettings().earlyAccessWindowMins;

        return currentMinutes >= earlyAccessStart && currentMinutes < slotStartMinutes;
    }

    /**
     * Check if current time is in post-class free access period
     */
    public async isPostClassFreeAccess(now: Date): Promise<boolean> {
        const lastSlot = await this.getLastSlotOfDay();
        if (!lastSlot) return false;

        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        const [endH, endM] = lastSlot.endTime.split(':').map(Number);
        const slotEndMinutes = endH * 60 + endM;

        return currentMinutes >= slotEndMinutes;
    }

    /**
     * Get the next slot after a break
     */
    public async getNextSlotAfterBreak(breakSlotId: string): Promise<TimeSlotConfig | null> {
        const breakSlot = await this.slotsCollection.findOne({ id: breakSlotId });
        if (!breakSlot || breakSlot.type !== "break") return null;

        const toMinutes = (timeStr: string) => {
            if (!timeStr) return -1;
            const [h, m] = timeStr.split(':').map(Number);
            return h * 60 + m;
        };

        const breakEndMinutes = toMinutes(breakSlot.endTime);

        // Find the next class slot that starts at or after break end
        const slots = await this.slotsCollection.find({
            isActive: true,
            type: { $regex: /class/i }
        }).toArray();

        const nextSlots = slots
            .filter((s: any) => toMinutes(s.startTime) >= breakEndMinutes)
            .sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));

        if (nextSlots.length === 0) return null;

        const nextSlot = nextSlots[0];
        return {
            id: nextSlot.id,
            startTime: nextSlot.startTime,
            endTime: nextSlot.endTime,
            type: "class",
            label: nextSlot.label || `Slot ${nextSlot.slotNumber}`,
            slotNumber: nextSlot.slotNumber,
            isActive: nextSlot.isActive
        };
    }

    /**
     * Calculate entry window duration for a slot
     * Returns 30 minutes for first slot, 5 minutes for others
     */
    public async calculateEntryWindow(slotId: string): Promise<number> {
        const settings = this.configService.getSettings();
        const isFirst = await this.isFirstSlotOfToday(slotId);
        return isFirst ? settings.studentFirstSlotWindowMins : settings.studentRegularWindowMins;
    }

    /**
     * Get all slots for the current day
     */
    public async getAllSlotsForDay(): Promise<TimeSlotConfig[]> {
        const slots = await this.slotsCollection.find({ isActive: true }).toArray();

        return slots.map((s: any) => ({
            id: s.id,
            startTime: s.startTime,
            endTime: s.endTime,
            type: s.type.toLowerCase() as "class" | "break",
            label: s.label || `Slot ${s.slotNumber}`,
            slotNumber: s.slotNumber,
            isActive: s.isActive
        }));
    }

    private getDefaultTimeSlots(): TimeSlotConfig[] {
        return [
            { id: 1, startTime: "09:00", endTime: "10:00", type: "class", label: "Period 1" },
            { id: 2, startTime: "10:00", endTime: "11:00", type: "class", label: "Period 2" },
            { id: 3, startTime: "11:00", endTime: "12:00", type: "class", label: "Period 3" },
            { id: 4, startTime: "12:00", endTime: "13:00", type: "class", label: "Period 4" },
            { id: "break", startTime: "13:00", endTime: "14:00", type: "break", label: "Lunch Break" },
            { id: 5, startTime: "14:00", endTime: "15:00", type: "class", label: "Period 5" },
            { id: 6, startTime: "15:00", endTime: "16:00", type: "class", label: "Period 6" },
            { id: 7, startTime: "16:00", endTime: "17:00", type: "class", label: "Period 7" },
        ];
    }
}
