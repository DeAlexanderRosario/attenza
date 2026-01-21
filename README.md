# 🎓 RFID Attendance Management System

## Overview
A comprehensive Next.js-based attendance management system with RFID integration, real-time tracking, and advanced analytics for educational institutions.

---

## 📋 Table of Contents
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Core Features](#core-features)
- [Data Models](#data-models)
- [Key Workflows](#key-workflows)
- [API Reference](#api-reference)

---

## 🛠️ Tech Stack

- **Frontend**: Next.js 16 (App Router), React, TypeScript
- **UI**: Tailwind CSS, shadcn/ui, Radix UI
- **Backend**: Next.js Server Actions
- **Database**: MongoDB (Native Driver)
- **Real-time**: Socket.IO
- **Charts**: Recharts
- **Authentication**: NextAuth.js

---

## 📁 Project Structure

```
iigh_azi/
├── app/
│   ├── actions/              # Server Actions (Backend Logic)
│   │   ├── admin.ts          # Dashboard stats, users, devices
│   │   ├── attendance.ts     # Attendance reports & analytics
│   │   ├── department.ts     # Department management
│   │   └── subjects.ts       # Subject/Course management
│   ├── dashboard/
│   │   └── admin/            # Admin Dashboard Pages
│   │       ├── attendance/   # Attendance tracking & reports
│   │       ├── departments/  # Department management
│   │       ├── subjects/     # Subject management
│   │       └── devices/      # Device management
├── components/
│   ├── admin/                # Admin Components
│   │   ├── attendance/       # Attendance components
│   │   ├── department/       # Department components
│   │   └── subjects/         # Subject components
│   └── ui/                   # shadcn/ui components
├── lib/
│   ├── types.ts              # TypeScript interfaces
│   ├── db.ts                 # Database connection
│   └── mongodb.ts            # MongoDB client
└── socket-server.ts          # WebSocket server for RFID
```

---

## ✨ Core Features

### 1. **Attendance System**
- ✅ Real-time RFID scanning
- ✅ Automatic status calculation (Present/Late/Absent)
- ✅ Grace period support (configurable)
- ✅ Department-wise summaries
- ✅ Export to CSV/Excel/PDF
- ✅ Universal search (Students/Departments/Subjects)

### 2. **Department Management**
- ✅ Department profiles with statistics
- ✅ Staff allocation (HOD, Class Tutors, Teachers)
- ✅ Teacher reallocation across departments
- ✅ Attendance trend graphs
- ✅ Department-specific analytics

### 3. **Subject/Course Management** 🆕
- ✅ Common subjects (shared across departments)
- ✅ Unique subjects (department-specific)
- ✅ Subject-to-Department mapping (many-to-many)
- ✅ Teacher-to-Subject mapping (many-to-many)
- ✅ Cross-department teaching support

### 4. **Device Management**
- ⚠️ Device registration (RFID readers, displays)
- ⚠️ Location mapping
- ⚠️ Status monitoring
- ⚠️ Configuration management

### 5. **Analytics & Reports**
- ✅ Dashboard with key metrics
- ✅ Attendance trends (7-day chart)
- ✅ Defaulter lists (<75% attendance)
- ⚠️ Period-wise heatmaps
- ⚠️ Faculty performance analytics

---

## 📊 Data Models

### User
```typescript
interface User {
  id: string
  name: string
  email: string
  role: "student" | "teacher" | "admin" | "super_admin"
  rfidTag?: string
  department?: string
  year?: number
  semester?: number
  points: number
}
```

### Subject (NEW)
```typescript
interface Subject {
  id: string
  name: string
  code: string
  credits: number
  type: "common" | "unique"  // Common = shared, Unique = dept-specific
  description?: string
}
```

### Subject-Department Mapping
```typescript
interface SubjectDepartmentMapping {
  id: string
  subjectId: string
  departmentCode: string
  semester: number
  isElective: boolean
}
```

### Teacher-Subject Mapping
```typescript
interface TeacherSubjectMapping {
  id: string
  teacherId: string
  subjectId: string
  departmentCode: string  // Teacher can teach in different dept
  semester: number
}
```

### Slot (Timetable Entry)
```typescript
interface Slot {
  id: string
  courseCode: string
  courseName: string
  teacherId: string
  day: string
  startTime: string
  endTime: string
  room: string
  department: string
  semester: number
  status?: "Scheduled" | "Conducted" | "Late" | "Cancelled"
}
```

### Attendance Record
```typescript
interface AttendanceRecord {
  id: string
  studentId: string
  slotId: string
  timestamp: Date
  status: "present" | "late" | "absent"
  pointsEarned: number
}
```

---

## 🔄 Key Workflows

### 1. RFID Attendance Marking Flow

```
1. Student scans RFID tag → Socket Server receives scan
2. Server checks current time slot (from time_slots config)
3. Finds matching slot (department, semester, day, time)
4. Check grace period:
   - Within 15 min → "present"
   - 15-30 min → "late"
   - >30 min or wrong slot → "absent"
5. Create attendance record in MongoDB
6. Update student points
7. Send real-time notification via WebSocket
```

### 2. Subject Assignment Flow

```
1. Admin creates Subject (name, code, credits, type)
2. Admin maps Subject → Department (semester, elective flag)
3. Admin assigns Teacher → Subject (for specific dept/semester)
4. Teacher can now teach this subject in that department
5. Timetable slots reference this subject via courseCode
```

### 3. Cross-Department Teaching

**Example**: Mathematics teacher from CS dept teaching in EE dept

```
1. Create Subject: "Mathematics" (type: "common")
2. Map to CS Dept → Semester 1
3. Map to EE Dept → Semester 1
4. Assign Teacher (CS dept teacher) → Math → CS Dept
5. Assign same Teacher → Math → EE Dept
6. Teacher now appears in both dept timetables
```

---

## 🔌 API Reference

### Attendance Actions
```typescript
// Get dashboard stats
getAttendanceDashboardStats() 
// Returns: { totalStudents, overallPercentage, defaultersCount, totalDepartments }

// Get department summary
getDepartmentAttendanceSummary(filters: AttendanceFilter)
// Returns: Array of { department, present, late, absent, attendanceRate }

// Export reports
getDetailedAttendanceReport(type: "monthly" | "daily", filters)
// Returns: Array of detailed attendance records for CSV export

// Universal search
globalSearch(query: string)
// Returns: { students[], departments[], courses[] }
```

### Subject Actions
```typescript
// CRUD Operations
getSubjects()
getSubjectById(id)
createSubject(data)
updateSubject(id, data)
deleteSubject(id)

// Department Mapping
assignSubjectToDepartment({ subjectId, departmentCode, semester, isElective })
removeSubjectFromDepartment(subjectId, departmentCode, semester)
getSubjectsByDepartment(departmentCode, semester?)

// Teacher Mapping
assignTeacherToSubject({ teacherId, subjectId, departmentCode, semester })
removeTeacherFromSubject(teacherId, subjectId, departmentCode)
getTeacherSubjects(teacherId)
getSubjectTeachers(subjectId, departmentCode?)
```

### Department Actions
```typescript
getDepartments()
getDepartmentById(id)
createDepartment(data)
getDepartmentStats(deptId)
// Returns: { totalStaff, maleStaff, femaleStaff, totalStudents, chartData }

assignHOD(deptId, teacherId)
reallocateTeacher(teacherId, newDeptCode)
```

---

## 🗄️ MongoDB Collections

### Core Collections
- `users` - Students, Teachers, Admins
- `departments` - Department entities
- `subjects` - Subject/Course catalog
- `subject_department_mappings` - Subject ↔ Department relationships
- `teacher_subject_mappings` - Teacher ↔ Subject relationships
- `slots` - Timetable entries
- `attendance` - Attendance records
- `devices` - RFID readers and devices
- `holidays` - Holiday calendar
- `system_settings` - Time slots configuration

### Indexes (Recommended)
```javascript
db.attendance.createIndex({ studentId: 1, timestamp: -1 })
db.attendance.createIndex({ slotId: 1 })
db.users.createIndex({ role: 1, department: 1 })
db.slots.createIndex({ department: 1, semester: 1, day: 1 })
db.subject_department_mappings.createIndex({ subjectId: 1, departmentCode: 1 })
db.teacher_subject_mappings.createIndex({ teacherId: 1 })
```

---

## 🚀 Getting Started

### 1. Environment Setup
```bash
# .env.local
MONGODB_URI=mongodb://localhost:27017/attenza
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=http://localhost:3000
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Run Development Server
```bash
npm run dev
```

### 4. Start Socket Server (for RFID)
```bash
node socket-server.js
```

---

## 🎯 Roadmap

### ✅ Completed
- [x] Real-time RFID attendance
- [x] Department management
- [x] Subject management with many-to-many relationships
- [x] Universal search
- [x] Main attendance dashboard
- [x] Export functionality

### 🚧 In Progress
- [ ] Student-wise detailed view (daily grid)
- [ ] Period-wise analytics heatmap
- [ ] Device management UI

### 📝 Planned
- [ ] Mobile app (PWA)
- [ ] SMS/Email notifications
- [ ] Biometric integration
- [ ] AI-powered attendance predictions
- [ ] Parent portal

---

## 🐛 Known Issues

1. ⚠️ Some admin pages not linked in navigation
2. ⚠️ Device management page incomplete
3. ⚠️ Timetable grid needs real status data (partially fixed)

---

## 📝 Notes

- **Grace Period**: Currently hardcoded (15 min for present, 30 min for late)
- **Defaulter Threshold**: 75% attendance
- **Time Slots**: Configurable via system_settings collection
- **Multi-Department Teaching**: Fully supported via teacher_subject_mappings

---

## 🤝 Contributing

When adding new features:
1. Update types in `lib/types.ts`
2. Create server actions in `app/actions/`
3. Build UI components in `components/`
4. Create page in `app/dashboard/admin/`
5. Update this README

---

**Last Updated**: 2025-12-23  
**Version**: 1.0.0
