import { User, Slot, AttendanceRecord, LeaderboardEntry, Notification, Achievement, DailyGamification } from "./types"

// This file simulates the database logic ("backend") for development
// In production, this would connect to MongoDB via Mongoose

export const DB = {
    user: {
        id: "student-123",
        name: "Alex Rohan",
        email: "alex@university.edu",
        role: "student",
        department: "Computer Science",
        year: 3,
        semester: 5,
        points: 1250,
        rfidTag: "A1B2C3D4",
        organizationId: "org-1",
        createdAt: new Date(),
    } as User,

    slots: [
        {
            id: "slot-1",
            name: "Lecture 1",
            courseCode: "CS301",
            courseName: "Data Structures",
            teacherId: "teacher-1",
            day: "Monday",
            startTime: "09:00",
            endTime: "09:50",
            room: "Hall A",
            department: "Computer Science",
            year: 3,
            semester: 5,
            isLastSlot: false,
            isActive: true,
        },
        {
            id: "slot-2",
            name: "Lecture 2",
            courseCode: "CS302",
            courseName: "Database Systems",
            teacherId: "teacher-2",
            day: "Monday",
            startTime: "10:00",
            endTime: "10:50",
            room: "Lab 3",
            department: "Computer Science",
            year: 3,
            semester: 5,
            isLastSlot: false,
            isActive: true,
        },
        {
            id: "slot-3",
            name: "Lecture 3",
            courseCode: "CS303",
            courseName: "Operating Systems",
            teacherId: "teacher-3",
            day: "Monday",
            startTime: "11:00",
            endTime: "11:50",
            room: "Hall B",
            department: "Computer Science",
            year: 3,
            semester: 5,
            isLastSlot: false,
            isActive: true,
        },
        {
            id: "slot-4",
            name: "Lecture 4",
            courseCode: "CS304",
            courseName: "Software Engineering",
            teacherId: "teacher-4",
            day: "Monday",
            startTime: "14:00", // 2 PM
            endTime: "14:50",
            room: "Hall C",
            department: "Computer Science",
            year: 3,
            semester: 5,
            isLastSlot: true, // Last slot for gamification
            isActive: true,
        },
    ] as Slot[],

    attendance: [
        {
            id: "att-1",
            studentId: "student-123",
            slotId: "slot-1",
            rfidTag: "A1B2C3D4",
            timestamp: new Date(new Date().setHours(9, 5, 0)), // 9:05 AM
            status: "present",
            pointsEarned: 10
        },
        // Slot 2 is intentionally missing (Absent)
    ] as AttendanceRecord[],

    leaderboard: [
        { rank: 1, studentId: "s-1", studentName: "Sarah J.", points: 1500, attendanceRate: 98, streak: 12, change: 0 },
        { rank: 2, studentId: "s-2", studentName: "Mike T.", points: 1450, attendanceRate: 96, streak: 8, change: 1 },
        { rank: 3, studentId: "s-3", studentName: "Emma W.", points: 1420, attendanceRate: 95, streak: 15, change: -1 },
        { rank: 14, studentId: "student-123", studentName: "Alex Rohan", points: 1250, attendanceRate: 72, streak: 3, change: 2 },
    ] as LeaderboardEntry[],

    notifications: [
        {
            id: "notif-1",
            userId: "student-123",
            type: "absent_alert",
            title: "Absent: Database Systems",
            message: "You were marked absent for CS302. Your attendance is now 71%.",
            read: false,
            timestamp: new Date(new Date().setHours(10, 55, 0)),
        },
        {
            id: "notif-2",
            userId: "student-123",
            type: "achievement",
            title: "Streak maintained!",
            message: "You have attended 3 days in a row.",
            read: true,
            timestamp: new Date(new Date().setDate(new Date().getDate() - 1)),
        }
    ] as Notification[],

    gamification: {
        date: new Date().toISOString().split('T')[0],
        studentId: "student-123",
        todaysPoints: 20,
        wordOfTheDay: {
            word: "ALGORITHM",
            hint: "A step-by-step procedure for calculations",
            isSolved: false
        }
    } as DailyGamification
}
