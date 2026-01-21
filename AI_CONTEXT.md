# Attenza - System Architecture & AI Development Guide

## 🧠 Core Philosophy
Attenza is a physical-digital bridge for classroom management. It relies on **Hardware (RFID Readers)**, **Real-time Websockets**, and **Database Persistence**.

**Primary Rule:** The Database is the Source of Truth.
In-memory states (`StateManager`) depend on it, and hardware actions (`DeviceController`) must sync back to it immediately.

---

## 🏗 System Architecture

### 1. The "Brain" (Socket Server)
Located in `root/socket-server.ts`.
- **Role**: Entry point for all hardware devices.
- **Responsibilities**:
  - Validates `sessionToken` from devices.
  - Initializes `DeviceController`.
  - Runs the `activeSessionService.cleanupExpiredSessions()` loop (vital for auto-closing classes).

### 2. DeviceController (`server/controllers/DeviceController.ts`)
The bridge between physical hardware and software logic.
- **Teacher Scan**:
  - Checks Room Availability.
  - Finds scheduled slot via `SlotService`.
  - Creates **Active Session** in DB.
  - Initializes **Active Slot** in Memory (`StateManager`).
  - Triggers **WhatsApp Alerts** (Teacher Arrival + Student Notifications).
  - **Logic**: Does **NOT** bulk mark present. Sends notifications *only* to students who haven't checked in.
- **Student Scan**:
  - Marks individual attendance via `AttendanceService`.
  - **Smart Logic**: Supports **Early Check-in** (up to 30 mins before class) if no active session exists.
  - **Dual Device**: Detects placement ('inside'/'outside') and logs it.

### 3. StateManager (`server/services/StateManager.ts`)
In-memory cache of what is happening RIGHT NOW.
- **Role**: Fast lookups for "Is class active in Room 101?".
- **Sync**: 
  - `checkTime(now)`: Runs every minute.
  - **Grace Period**: Cancels class if teacher is late.
  - **End Time**: Marks class CLOSED in Memory AND Database (`activeSessionService.closeSession`).

### 4. SlotService (`server/services/SlotService.ts`)
The Timetable Logic.
- **Crucial Feature**: **Minutes-based Time Matching**.
  - It converts "08:30" to `510` minutes.
  - Compares `start <= now < end`.
  - **Locale**: Always uses `en-IN` (India Standard Time) for "Day of Week" calculations to Ensure "Monday" in server matches "Monday" in the classroom.

### 5. AttendanceService (`server/services/AttendanceService.ts`)
- **Uniqueness Scope**: `studentId` + `slotId` + `date` (YYYY-MM-DD).
- **Date Handling**: Stores `date` field explicitly to differentiate "Physics Class" on Friday Jan 9th from Friday Jan 16th.
- **Features**:
  - `markStudent`: Individual scan.
  - `getPresentStudents`: Helper to filter notifications.

### 6. WhatsAppService (`server/services/WhatsAppService.ts`)
- Handles text alerts via `whatsapp-web.js`.
- **Templates**: Includes "Day: Monday", Name, Subject, Time.

---

## 🔑 Crucial Logic Flows (Do Not Break)

### A. The "Teacher Check-in" Flow
1. **Hardware**: Sends RFID tag + Device ID.
2. **DeviceController**: 
   - Finds `Class` associated with Device/Teacher.
   - Calls `SlotService.getCurrentClassSlot` using `en-IN` day.
   - **DB**: Creates `ActiveSession` (Status: ACTIVE).
   - **Memory**: `StateManager.initializeSlot` (stores `sessionId`).
   - **Notify**: Fetches class list -> Removes already checked-in students -> Sends WhatsApp alerts to the rest.
   - **Attendance**: **NO** bulk marking. Relies on student scans.

### B. The "Student Smart Check-in" Flow
1. **Scenario 1: Active Class**: Standard logic. Marks 'Present' or 'Late' based on time.
2. **Scenario 2: Early/Break (No Active Class)**:
   - System looks ahead **30 minutes** for a scheduled class `(SLOT_UPCOMING)`.
   - If found: Marks student **PRESENT** for that upcoming slot.
   - **Context**: Logs "Inside" or "Outside" based on device placement.

### C. Attendance Scoping
When querying or marking attendance:
- **ALWAYS** include the `date` string (e.g., "2024-03-21").
- **NEVER** rely solely on `slotId` across different days.

---

## 🛠 Future AI Tasks

When working on this codebase, checking these files first saves 90% of debugging time:
1. `server/types.ts` - Data structures (ActiveSlot, Session).
2. `server/controllers/DeviceController.ts` - The main logic hub.
3. `server/services/AttendanceService.ts` - Logic for marking and existence checks.

**Testing**: Use `tools/simple_device_client.ts [inside|outside]` to simulate hardware events.
