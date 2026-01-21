import { Collection } from "mongodb";
import { TimeSlotConfig } from "../types";

export class SlotService {
    constructor(
        private slotsCollection: Collection, // college_slots
        private settingsCollection: Collection,
        private classesCollection: Collection // classes collection
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

        const activeSlot = slots.find((s: any) => {
            const start = toMinutes(s.startTime);
            const end = toMinutes(s.endTime);
            // Strict inequality for end time to avoid overlap at e.g. 09:00
            // Logic: start <= now < end
            return currentMinutes >= start && currentMinutes < end;
        });

        if (!activeSlot) return null;

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

        // Query the class's timetable array
        const classDoc = await this.classesCollection.findOne({
            id: user.classId,
            "timetable.classSlotId": activePeriod.id,
            "timetable.dayOfWeek": todayDay
        });

        if (!classDoc || !classDoc.timetable) return null;

        // Find the specific entry
        return classDoc.timetable.find((entry: any) =>
            entry.classSlotId === activePeriod.id &&
            entry.dayOfWeek === todayDay
        );
    }

    public async getSlotById(slotId: string) {
        return await this.slotsCollection.findOne({ id: slotId });
    }

    /**
     * Finds the scheduled class for a teacher at a specific time.
     */
    public async getCurrentTeacherSlot(teacherId: string, now: Date) {
        // 1. Get Active Time Slot (e.g., 09:00-10:00)
        const activePeriod = await this.getActivePeriod(now);
        if (!activePeriod) return null;

        const currentDay = now.toLocaleDateString('en-IN', { weekday: 'long' });

        // 2. Find any class that has this teacher assigned to this slot/day
        const classDoc = await this.classesCollection.findOne({
            "timetable": {
                $elemMatch: {
                    teacherId: teacherId,
                    dayOfWeek: currentDay,
                    classSlotId: activePeriod.id
                }
            }
        });

        if (!classDoc || !classDoc.timetable) return null;

        // Return the matching entry with classId
        const entry = classDoc.timetable.find((e: any) =>
            e.teacherId === teacherId &&
            e.dayOfWeek === currentDay &&
            e.classSlotId === activePeriod.id
        );

        return entry ? { ...entry, classId: classDoc.id } : null;
    }

    /**
     * Finds the scheduled class for a specific Class ID at this time.
     */
    public async getCurrentClassSlot(classId: string, now: Date) {
        const activePeriod = await this.getActivePeriod(now);
        if (!activePeriod) return null;

        const currentDay = now.toLocaleDateString('en-IN', { weekday: 'long' });

        // Query the class document
        const classDoc = await this.classesCollection.findOne({ id: classId });
        if (!classDoc || !classDoc.timetable) return null;

        // Find the entry for this day/slot
        const entry = classDoc.timetable.find((e: any) =>
            e.classSlotId === activePeriod.id &&
            e.dayOfWeek === currentDay
        );

        return entry ? { ...entry, classId: classDoc.id } : null;
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
