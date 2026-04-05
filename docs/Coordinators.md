# Coordinators Module Documentation

## Table of Contents
1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Coordinator Registration](#coordinator-registration)
4. [Dashboard Features](#dashboard-features)
5. [User Management](#user-management)
6. [Evaluations (Campus Tasks + Grading)](#evaluations-campus-tasks--grading)
7. [Evaluation Panels (Panel Composition + Assignments + AI Suggest)](#evaluation-panels-panel-composition--assignments--ai-suggest)
8. [Resource Requests (Supervisor-Approved → Coordinator Workflow)](#resource-requests-supervisor-approved--coordinator-workflow)
9. [Industrial Projects](#industrial-projects)
10. [Notification Broadcasting](#notification-broadcasting)
11. [Chat & Communication](#chat--communication)
12. [Profile Management](#profile-management)
13. [API Routes & Endpoints](#api-routes--endpoints)
14. [Database Models](#database-models)
15. [Permissions & Access Control](#permissions--access-control)
16. [System Administration](#system-administration)
17. [Performance Optimizations](#performance-optimizations)

---

## Overview

The Coordinator module provides administrative capabilities for FYP Coordinators to:

1. **Manage Users**: Add, suspend, activate, remove, and manage students and supervisors (campus-scoped)
2. **Monitor Campus**: View statistics and activity across the campus
3. **Broadcast Notifications**: Send announcements to specific roles or all users
4. **Run Evaluations**: Create evaluation tasks, track submissions and grade them
5. **Define Panels**: Create evaluation panels, assign groups, and manage panel membership
6. **Process Resource Requests**: Review supervisor-approved requests; schedule meetings; approve/reject
7. **Publish Industrial Projects**: Upload and manage industrial project postings for the campus

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       COORDINATOR FRONTEND PAGES                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  /coordinator/dashboard     - Campus overview and statistics                 │
│  /coordinator/add-student   - Add new student accounts                       │
│  /coordinator/add-supervisor- Add new supervisor accounts                    │
│  /coordinator/manage-users  - User management interface                      │
│  /coordinator/chat          - Messaging interface                            │
│  /coordinator/notifications - Notification management                        │
│  /coordinator/profile       - Profile management                             │
│  /coordinator/evaluations   - Manage evaluations (tasks + grading)          │
│  /coordinator/panels        - Manage evaluation panels                      │
│  /coordinator/projects       - Manage industrial projects                    │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            API LAYER                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│  /api/coordinator/dashboard    - Campus statistics                           │
│  /api/coordinator/add-students - Bulk student creation                       │
│  /api/coordinator/add-supervisors - Bulk supervisor creation                 │
│  /api/coordinator/get-users    - List campus users                           │
│  /api/coordinator/manage-user  - User status management                      │
│  /api/notifications/*          - Notification CRUD                           │
│  /api/chat/*                   - Messaging                                   │
│  /api/profile/*                - Profile management                          │
│  /api/coordinator/evaluations   - Evaluations CRUD                          │
│  /api/coordinator/panels        - Evaluation panels CRUD                    │
│  /api/coordinator/projects       - Industrial projects CRUD                  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          DATABASE MODELS                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│  FYPCoordinator            - Coordinator profile                             │
│  User                      - All user accounts                               │
│  Student                   - Student profiles                                │
│  FYPSupervisor             - Supervisor profiles                             │
│  Notification              - Announcements and alerts                        │
│  Campus                    - Campus information                              │
│  Evaluation                 - Evaluations (tasks)                           │
│  Panel                     - Evaluation panels                               │
│  IndustrialProject         - Industrial project postings                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Coordinator Registration

Coordinators are typically:
1. Pre-seeded in the database during initial setup
2. Created by system administrators

### Coordinator Record Structure

```prisma
model FYPCoordinator {
  coordinatorId Int      @id @default(autoincrement())
  userId        Int      @unique        // Link to User
  campusId      Int                     // Campus managed
  description   String?  @db.Text       // About section
  department    String?  @db.VarChar(255)
  designation   String?  @db.VarChar(255)
  officeHours   String?  @db.VarChar(255)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  user   User   @relation(fields: [userId], references: [userId], onDelete: Cascade)
  campus Campus @relation(fields: [campusId], references: [campusId])

  @@map("fyp_coordinators")
}
```

---

## Dashboard Features

### Dashboard API (`/api/coordinator/dashboard`)

```typescript
export async function GET(request: NextRequest) {
  const session = await auth();
  
  if (!session?.user?.id || session.user.role !== 'coordinator') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = parseInt(session.user.id);

  // Get coordinator info and campus
  const coordinator = await prisma.fYPCoordinator.findUnique({
    where: { userId },
    include: { campus: true }
  });

  if (!coordinator) {
    return NextResponse.json({ error: 'Coordinator not found' }, { status: 404 });
  }

  const campusId = coordinator.campusId;

  // Parallel fetch all statistics
  const [
    totalStudents,
    totalSupervisors,
    totalGroups,
    totalProjects,
    groupsWithSupervisor,
    groupsWithoutSupervisor,
    pendingStudents,
    pendingSupervisors,
    recentNotifications
  ] = await Promise.all([
    // Total students in campus
    prisma.student.count({
      where: { campusId }
    }),
    
    // Total supervisors in campus
    prisma.fYPSupervisor.count({
      where: { campusId }
    }),
    
    // Total groups
    prisma.group.count({
      where: {
        students: {
          some: { campusId }
        }
      }
    }),
    
    // Total projects
    prisma.project.count({
      where: {
        OR: [
          { student: { campusId } },
          { supervisor: { campusId } }
        ]
      }
    }),
    
    // Groups with supervisor
    prisma.group.count({
      where: {
        supervisorId: { not: null },
        students: { some: { campusId } }
      }
    }),
    
    // Groups without supervisor
    prisma.group.count({
      where: {
        supervisorId: null,
        students: { some: { campusId } }
      }
    }),
    
    // Pending student accounts
    prisma.user.count({
      where: {
        role: 'student',
        status: 'pending',
        student: { campusId }
      }
    }),
    
    // Pending supervisor accounts
    prisma.user.count({
      where: {
        role: 'supervisor',
        status: 'pending',
        supervisor: { campusId }
      }
    }),
    
    // Recent notifications created by coordinator
    prisma.notification.findMany({
      where: { createdById: userId },
      orderBy: { createdAt: 'desc' },
      take: 5
    })
  ]);

  // Calculate supervision rate
  const supervisionRate = totalGroups > 0 
    ? Math.round((groupsWithSupervisor / totalGroups) * 100) 
    : 0;

  return NextResponse.json({
    coordinator: {
      name: session.user.name,
      campus: coordinator.campus.name,
      department: coordinator.department
    },
    stats: {
      totalStudents,
      totalSupervisors,
      totalGroups,
      totalProjects,
      groupsWithSupervisor,
      groupsWithoutSupervisor,
      supervisionRate,
      pendingApprovals: pendingStudents + pendingSupervisors,
      pendingStudents,
      pendingSupervisors
    },
    recentNotifications: recentNotifications.map(n => ({
      id: n.notificationId,
      title: n.title,
      type: n.targetType,
      createdAt: n.createdAt
    }))
  });
}
```

### Dashboard UI Layout

```
┌────────────────────────────────────────────────────────────────────────────┐
│  Header: "Campus Dashboard - [Campus Name]" + NotificationBell             │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  ┌────────────────────────────────────────────────────────────────────┐   │
│  │                    QUICK STATISTICS                                │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐           │   │
│  │  │ 👨‍🎓 150  │  │ 👩‍🏫 20   │  │ 👥 40    │  │ 📁 35    │           │   │
│  │  │ Students │  │ Supervisors│  │ Groups   │  │ Projects │           │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘           │   │
│  └────────────────────────────────────────────────────────────────────┘   │
│                                                                            │
│  ┌─────────────────────────────┐  ┌──────────────────────────────────┐   │
│  │     SUPERVISION RATE        │  │      PENDING APPROVALS           │   │
│  │                             │  │                                  │   │
│  │  [============----] 85%    │  │  👨‍🎓 3 Student accounts          │   │
│  │  34/40 groups supervised    │  │  👩‍🏫 1 Supervisor account        │   │
│  │                             │  │                                  │   │
│  │  6 groups need supervisors  │  │     [Review Approvals]           │   │
│  └─────────────────────────────┘  └──────────────────────────────────┘   │
│                                                                            │
│  ┌─────────────────────────────┐  ┌──────────────────────────────────┐   │
│  │     QUICK ACTIONS           │  │      RECENT ACTIVITY             │   │
│  │                             │  │                                  │   │
│  │  [+ Add Student]            │  │  • New student registered        │   │
│  │  [+ Add Supervisor]         │  │  • Group "AI Health" formed      │   │
│  │  [📢 Send Notification]     │  │  • Dr. Smith joined as supervisor│   │
│  │  [👥 Manage Users]          │  │  • Notification sent to all      │   │
│  └─────────────────────────────┘  └──────────────────────────────────┘   │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## User Management

### Add Students (`/coordinator/add-student`)

#### Bulk Student Addition

```typescript
// POST /api/coordinator/add-students
export async function POST(request: NextRequest) {
  const session = await auth();
  
  if (!session?.user?.id || session.user.role !== 'coordinator') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = parseInt(session.user.id);
  const body = await request.json();
  const { students } = body; // Array of student data

  // Get coordinator's campus
  const coordinator = await prisma.fYPCoordinator.findUnique({
    where: { userId }
  });

  const results = {
    success: [] as string[],
    failed: [] as { email: string; reason: string }[]
  };

  for (const studentData of students) {
    try {
      const { name, email, rollNumber, password } = studentData;

      // Check if email exists
      const existingUser = await prisma.user.findUnique({
        where: { email }
      });

      if (existingUser) {
        results.failed.push({ email, reason: 'Email already exists' });
        continue;
      }

      // Check if roll number exists
      const existingRoll = await prisma.student.findFirst({
        where: { rollNumber }
      });

      if (existingRoll) {
        results.failed.push({ email, reason: 'Roll number already exists' });
        continue;
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user and student in transaction
      await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            name,
            email,
            password: hashedPassword,
            role: 'student',
            status: 'active' // Coordinator-added students are auto-active
          }
        });

        await tx.student.create({
          data: {
            userId: user.userId,
            campusId: coordinator.campusId,
            rollNumber
          }
        });
      });

      results.success.push(email);

    } catch (error) {
      results.failed.push({ 
        email: studentData.email, 
        reason: error.message || 'Unknown error' 
      });
    }
  }

  return NextResponse.json({
    message: `Added ${results.success.length} students successfully`,
    results
  });
}
```

#### Add Student UI

```typescript
// Features:
// 1. Single student form
// 2. CSV bulk upload
// 3. Excel bulk upload
// 4. Results summary

interface StudentFormData {
  name: string;
  email: string;
  rollNumber: string;
  password: string;
}

const AddStudentPage = () => {
  const [mode, setMode] = useState<'single' | 'bulk'>('single');
  const [students, setStudents] = useState<StudentFormData[]>([]);
  
  const handleCSVUpload = (file: File) => {
    // Parse CSV and populate students array
    Papa.parse(file, {
      header: true,
      complete: (results) => {
        const parsedStudents = results.data.map(row => ({
          name: row.name,
          email: row.email,
          rollNumber: row.roll_number,
          password: generateRandomPassword() // Or from CSV
        }));
        setStudents(parsedStudents);
      }
    });
  };
  
  const handleSubmit = async () => {
    const response = await fetch('/api/coordinator/add-students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ students })
    });
    // Handle response...
  };
};
```

### Add Supervisors (`/coordinator/add-supervisor`)

#### Supervisor Addition

```typescript
// POST /api/coordinator/add-supervisors
export async function POST(request: NextRequest) {
  const session = await auth();
  
  if (!session?.user?.id || session.user.role !== 'coordinator') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = parseInt(session.user.id);
  const body = await request.json();
  const { supervisors } = body;

  const coordinator = await prisma.fYPCoordinator.findUnique({
    where: { userId }
  });

  const results = {
    success: [] as string[],
    failed: [] as { email: string; reason: string }[]
  };

  for (const supervisorData of supervisors) {
    try {
      const { name, email, password, specialization, maxGroups } = supervisorData;

      const existingUser = await prisma.user.findUnique({
        where: { email }
      });

      if (existingUser) {
        results.failed.push({ email, reason: 'Email already exists' });
        continue;
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            name,
            email,
            password: hashedPassword,
            role: 'supervisor',
            status: 'active'
          }
        });

        await tx.fYPSupervisor.create({
          data: {
            userId: user.userId,
            campusId: coordinator.campusId,
            specialization,
            maxGroups: maxGroups || 7
          }
        });
      });

      results.success.push(email);

    } catch (error) {
      results.failed.push({ 
        email: supervisorData.email, 
        reason: error.message || 'Unknown error' 
      });
    }
  }

  return NextResponse.json({
    message: `Added ${results.success.length} supervisors successfully`,
    results
  });
}
```

### Manage Users (`/coordinator/manage-users`)

#### User Management Features

1. **View All Users**: List all students and supervisors
2. **Filter Users**: By role, status, search
3. **User Actions**:
   - Activate pending accounts
   - Suspend active accounts
   - Reactivate suspended accounts
   - View user details

#### Get Users API

```typescript
// GET /api/coordinator/get-users
export async function GET(request: NextRequest) {
  const session = await auth();
  
  if (!session?.user?.id || session.user.role !== 'coordinator') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = parseInt(session.user.id);
  const { searchParams } = new URL(request.url);
  const role = searchParams.get('role'); // 'student', 'supervisor', or 'all'
  const status = searchParams.get('status'); // 'active', 'pending', 'suspended', 'all'
  const search = searchParams.get('search');

  const coordinator = await prisma.fYPCoordinator.findUnique({
    where: { userId }
  });

  // Build where clause
  const where: any = {};
  
  if (role && role !== 'all') {
    where.role = role;
  } else {
    where.role = { in: ['student', 'supervisor'] };
  }
  
  if (status && status !== 'all') {
    where.status = status;
  }
  
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } }
    ];
  }

  // Get users with role-specific data
  const users = await prisma.user.findMany({
    where,
    include: {
      student: {
        where: { campusId: coordinator.campusId },
        include: { group: true }
      },
      supervisor: {
        where: { campusId: coordinator.campusId }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  // Filter to only include users from this campus
  const campusUsers = users.filter(user => 
    (user.role === 'student' && user.student) ||
    (user.role === 'supervisor' && user.supervisor)
  );

  return NextResponse.json({
    users: campusUsers.map(user => ({
      userId: user.userId,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      profileImage: user.profileImage,
      createdAt: user.createdAt,
      // Role-specific data
      ...(user.role === 'student' && user.student ? {
        rollNumber: user.student.rollNumber,
        groupId: user.student.groupId,
        groupName: user.student.group?.groupName
      } : {}),
      ...(user.role === 'supervisor' && user.supervisor ? {
        specialization: user.supervisor.specialization,
        totalGroups: user.supervisor.totalGroups,
        maxGroups: user.supervisor.maxGroups
      } : {})
    }))
  });
}
```

#### Manage User Actions

```typescript
// POST /api/coordinator/manage-user
export async function POST(request: NextRequest) {
  const session = await auth();
  
  if (!session?.user?.id || session.user.role !== 'coordinator') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { targetUserId, action } = body; // action: 'activate', 'suspend', 'reactivate', 'remove'

  // Validate target user exists and is in coordinator's campus
  const targetUser = await prisma.user.findUnique({
    where: { userId: targetUserId },
    include: {
      student: true,
      supervisor: true
    }
  });

  if (!targetUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Determine new status
  let newStatus: string;
  switch (action) {
    case 'activate':
      if (targetUser.status !== 'pending') {
        return NextResponse.json({ error: 'User is not pending' }, { status: 400 });
      }
      newStatus = 'active';
      break;
    case 'suspend':
      if (targetUser.status !== 'active') {
        return NextResponse.json({ error: 'User is not active' }, { status: 400 });
      }
      newStatus = 'suspended';
      break;
    case 'reactivate':
      if (targetUser.status !== 'suspended') {
        return NextResponse.json({ error: 'User is not suspended' }, { status: 400 });
      }
      newStatus = 'active';
      break;
    case 'remove':
      newStatus = 'removed';
      break;
    default:
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  // Update user status
  await prisma.user.update({
    where: { userId: targetUserId },
    data: { status: newStatus }
  });

  // Notify the user
  await prisma.notification.create({
    data: {
      title: `Account ${action === 'activate' ? 'Activated' : action === 'suspend' ? 'Suspended' : 'Reactivated'}`,
      message: `Your account has been ${action}d by the coordinator.`,
      type: action === 'suspend' ? 'warning' : 'success',
      targetType: 'specific_users',
      createdById: parseInt(session.user.id),
      recipients: {
        create: { userId: targetUserId }
      }
    }
  });

  return NextResponse.json({ 
    success: true,
    message: `User ${action}d successfully`
  });
}
```

---

## Evaluations (Campus Tasks + Grading)

Coordinator evaluations are campus-scoped “tasks” with optional attachments and group submissions.

#### `GET /api/coordinator/evaluations`

Returns all evaluations for the coordinator’s campus, including:
- attachments (evaluation-level)
- submissions including attachments
- computed stats:
  - `submissionsCount`
  - `gradedCount`
  - `totalGroups` (groups in campus)

#### `POST /api/coordinator/evaluations`

Creates a new evaluation.

Validation (implemented):
- `title`, `description`, `dueDate` are required (400 otherwise).
- `totalMarks` defaults to `100`.
- `status` is set to `active`.

Side-effect (best-effort, non-blocking):
- Creates an informational notification for **all students** in the campus.

#### `PATCH /api/coordinator/evaluations`

Supports multiple actions:

1) Grade a submission:
- body must include `action: 'grade'` and `submissionId`
- requires `obtainedMarks` (400 if missing)
- updates submission: `obtainedMarks`, `feedback`, `status: 'graded'`, `gradedById`, `gradedAt`

2) Update evaluation status:
- `action: 'updateStatus'` + `evaluationId` + `status`

3) Update evaluation details:
- `evaluationId` plus optional fields (`title`, `description`, `instructions`, `totalMarks`, `dueDate`)

#### `DELETE /api/coordinator/evaluations?evaluationId=...`

Deletes evaluation by id.

---

## Evaluation Panels (Panel Composition + Assignments + AI Suggest)

Panels are campus-scoped structures with:
- `panelMembers` (supervisors with roles)
- `groupAssignments` (groups scheduled for evaluation)

#### `GET /api/coordinator/evaluation-panels`

Returns:
- `panels[]` with members and assignments plus `_count` stats
- `statistics`: total groups eligible (supervisor assigned), total supervisors, total panels, active panels
- `supervisors[]`: supervisors not already inside any panel, with workload fields and calculated `availableSlots`
- `groups[]`: eligible groups with students
- `campusName`

Eligibility rule implemented for `groups` statistics:
- group must be in campus AND must have `supervisorId != null` (project is not required for this listing in the current handler).

#### `POST /api/coordinator/evaluation-panels`

Creates a panel.

Validation (implemented):
- `name`, `minSupervisors`, `maxSupervisors` are required.
- If `panelMembers` provided:
  - if count `< minSupervisors` → 400
  - if count `> maxSupervisors` → 400

Status assignment:
- If member count `>= minSupervisors` → `status: 'active'`
- else → `status: 'draft'`

#### `POST /api/coordinator/evaluation-panels/ai-suggest`

Uses Cohere to generate panel composition suggestions.

Validation:
- Requires `query`.
- Automatically gathers context (supervisors with workload, eligible groups, existing panels) if `context` is not supplied.

Output:
- `suggestion` string and a `contextUsed` summary.

---

## Resource Requests (Supervisor-Approved → Coordinator Workflow)

Coordinators only see requests that are already supervisor-approved (or later states).

#### `GET /api/coordinator/resource-requests`

Returns requests for coordinator’s campus whose status is in:
- `supervisor_approved`, `coordinator_review`, `meeting_scheduled`, `approved`, `rejected`

Response includes:
- group name, createdBy, supervisorName
- meeting fields (`meetingDate`, `meetingTime`, `meetingLink`, `meetingVenue`, `meetingType`)

#### `POST /api/coordinator/resource-requests`

Actions:
- `schedule_meeting`:
  - requires `meetingDate` (400 if missing)
  - updates request `status: 'meeting_scheduled'` and meeting metadata
  - also creates a row in `meeting` table for the group dashboard (`status: 'scheduled'`, createdByRole: `coordinator`)
- `approve` → sets `status: 'approved'`
- `reject` → sets `status: 'rejected'`

---

## Industrial Projects

Industrial projects are campus-scoped postings.

#### `GET /api/coordinator/industrial-projects?status=...&search=...`

Note: this endpoint supports coordinator/supervisor/student reads by deriving campusId from role.

Filters:
- `status` (default `all`)
- `search` (case-insensitive, matches title/description/features/techStack)

Includes request details with requester user info.

#### `POST /api/coordinator/industrial-projects`

Coordinator-only creation.

Validation:
- `title` and `description` required.
- Sets `status: 'available'`.

---

## API Routes & Endpoints

Add/verify these coordinator-scoped endpoints (in addition to common chat/profile/notifications endpoints in `docs/Common.md`).

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/coordinator/dashboard` | Campus dashboard snapshot |
| POST | `/api/coordinator/add-students` | Bulk add students |
| POST | `/api/coordinator/add-supervisors` | Bulk add supervisors |
| GET | `/api/coordinator/get-users` | List campus users |
| PUT/PATCH/DELETE | `/api/coordinator/manage-user` | Update details; status changes; permanent delete |
| GET/POST/PATCH/DELETE | `/api/coordinator/evaluations` | Create/list/update/delete evaluations + grade submissions |
| GET | `/api/coordinator/evaluation-scores` | Aggregate supervisor/panel/coordinator evaluation scoring |
| GET/POST/PATCH | `/api/coordinator/evaluation-panels` | Panel CRUD + activation/completion (see handler) |
| POST | `/api/coordinator/evaluation-panels/ai-suggest` | Cohere-powered suggested panel composition |
| GET/POST | `/api/coordinator/resource-requests` | Review supervisor-approved requests; schedule meeting; approve/reject |
| GET/POST | `/api/coordinator/industrial-projects` | List/create industrial projects |
| POST | `/api/coordinator/industrial-projects/upload` | Upload industrial project assets |
| GET/PATCH/DELETE | `/api/coordinator/industrial-projects/[id]` | Per-project operations |
| POST | `/api/coordinator/industrial-projects/[id]/request` | Request/assign workflow |

---

## Database Models

### FYPCoordinator Model

```prisma
model FYPCoordinator {
  coordinatorId Int      @id @default(autoincrement())
  userId        Int      @unique
  campusId      Int
  description   String?  @db.Text
  department    String?  @db.VarChar(255)
  designation   String?  @db.VarChar(255)
  officeHours   String?  @db.VarChar(255)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  user   User   @relation(fields: [userId], references: [userId], onDelete: Cascade)
  campus Campus @relation(fields: [campusId], references: [campusId])

  @@map("fyp_coordinators")
}
```

### Campus Model

```prisma
model Campus {
  campusId      Int      @id @default(autoincrement())
  name          String   @db.VarChar(255)
  location      String?  @db.VarChar(255)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  students     Student[]
  supervisors  FYPSupervisor[]
  coordinators FYPCoordinator[]
  notifications Notification[]

  @@map("campuses")
}
```

### User Status Enum

```prisma
// User statuses
// 'active'    - Normal access
// 'pending'   - Awaiting activation
// 'suspended' - Access revoked
// 'removed'   - Soft-deleted (no access)

model User {
  status String @default("active") @db.VarChar(20)
}
```

---

## Permissions & Access Control

### Coordinator Permissions Matrix

| Resource | View | Create | Edit | Delete |
|----------|------|--------|------|--------|
| Own Profile | ✅ | - | ✅ | - |
| Campus Students | ✅ | ✅ | ✅ (status) | - |
| Campus Supervisors | ✅ | ✅ | ✅ (status) | - |
| Campus Groups | ✅ | - | - | - |
| Campus Projects | ✅ | - | - | - |
| Notifications | ✅ | ✅ | - | ✅ |
| Chat | ✅ | ✅ | - | - |
| Evaluations | ✅ | ✅ | ✅ (grade, status) | - |
| Panels | ✅ | ✅ | ✅ (status) | - |
| Resource Requests | ✅ | - | - | - |
| Industrial Projects | ✅ | ✅ | - | - |

### Access Validation Pattern

```typescript
// Standard coordinator access check
export async function GET(request: NextRequest) {
  const session = await auth();
  
  // 1. Authentication
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // 2. Role verification
  if (session.user.role !== 'coordinator') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  
  const userId = parseInt(session.user.id);
  
  // 3. Get coordinator's campus
  const coordinator = await prisma.fYPCoordinator.findUnique({
    where: { userId }
  });
  
  if (!coordinator) {
    return NextResponse.json({ error: 'Coordinator not found' }, { status: 404 });
  }
  
  // 4. Scope queries to campus
  const data = await prisma.someModel.findMany({
    where: { campusId: coordinator.campusId }
  });
  
  return NextResponse.json(data);
}
```

---

## System Administration

### Account Lifecycle Management

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   pending   │ --> │   active    │ --> │  suspended  │
│             │     │             │ <-- │             │
└─────────────┘     └─────────────┘     └─────────────┘
   activate()         suspend()           reactivate()
```

### Suspended User Handling

```typescript
// Middleware check for suspended users
export async function middleware(request: NextRequest) {
  const session = await getToken({ req: request });
  
  if (session?.user?.status === 'suspended') {
    // Redirect to suspended page
    return NextResponse.redirect(new URL('/suspended', request.url));
  }
  
  return NextResponse.next();
}
```

### Suspended Page (`/suspended`)

```typescript
const SuspendedPage = () => {
  const { signOut } = useSession();
  
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Card className="max-w-md p-6 text-center">
        <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Account Suspended</h1>
        <p className="text-gray-600 mb-6">
          Your account has been suspended by the coordinator. 
          Please contact your FYP coordinator for more information.
        </p>
        <Button onClick={() => signOut({ callbackUrl: '/login' })}>
          Sign Out
        </Button>
      </Card>
    </div>
  );
};
```

---

## Performance Optimizations

### 1. Dashboard Statistics (Parallel Queries)

```typescript
// Execute all stats queries in parallel
const [students, supervisors, groups, projects, ...rest] = await Promise.all([
  prisma.student.count({ where: { campusId } }),
  prisma.fYPSupervisor.count({ where: { campusId } }),
  prisma.group.count({ where: { students: { some: { campusId } } } }),
  prisma.project.count({ where: { /* campus scope */ } }),
  // ... more queries
]);
```

### 2. User List Pagination

```typescript
// GET /api/coordinator/get-users with pagination
const page = parseInt(searchParams.get('page') || '1');
const limit = parseInt(searchParams.get('limit') || '20');
const skip = (page - 1) * limit;

const [users, total] = await Promise.all([
  prisma.user.findMany({
    where,
    include: { student: true, supervisor: true },
    skip,
    take: limit,
    orderBy: { createdAt: 'desc' }
  }),
  prisma.user.count({ where })
]);

return NextResponse.json({
  users: /* formatted */,
  pagination: {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit)
  }
});
```

### 3. Bulk Operations with Transactions

```typescript
// Bulk student creation with transaction
const results = await prisma.$transaction(async (tx) => {
  const created: string[] = [];
  
  for (const studentData of students) {
    try {
      const user = await tx.user.create({
        data: { /* user data */ }
      });
      
      await tx.student.create({
        data: { userId: user.userId, /* student data */ }
      });
      
      created.push(studentData.email);
    } catch (error) {
      // Log error but continue with others
    }
  }
  
  return created;
});
```

### 4. Caching User Lists

```typescript
// Cache fetched user lists on client
const [usersCache, setUsersCache] = useState<Map<string, User[]>>(new Map());

const fetchUsers = async (filters: string) => {
  // Check cache first
  if (usersCache.has(filters)) {
    return usersCache.get(filters);
  }
  
  const response = await fetch(`/api/coordinator/get-users?${filters}`);
  const data = await response.json();
  
  // Cache for 30 seconds
  setUsersCache(prev => new Map(prev).set(filters, data.users));
  setTimeout(() => {
    setUsersCache(prev => {
      const newCache = new Map(prev);
      newCache.delete(filters);
      return newCache;
    });
  }, 30000);
  
  return data.users;
};
```

---

## UI Components

### CoordinatorSidebar

```typescript
const sidebarItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/coordinator/dashboard' },
  { icon: UserPlus, label: 'Add Student', path: '/coordinator/add-student' },
  { icon: UserPlus, label: 'Add Supervisor', path: '/coordinator/add-supervisor' },
  { icon: Users, label: 'Manage Users', path: '/coordinator/manage-users' },
  { icon: MessageSquare, label: 'Chat', path: '/coordinator/chat' },
  { icon: Bell, label: 'Notifications', path: '/coordinator/notifications' },
  { icon: User, label: 'Profile', path: '/coordinator/profile' },
  { icon: ClipboardList, label: 'Evaluations', path: '/coordinator/evaluations' },
  { icon: Users, label: 'Panels', path: '/coordinator/panels' },
  { icon: Briefcase, label: 'Projects', path: '/coordinator/projects' },
];
```

### User Management Table Component

```typescript
interface UserTableProps {
  users: User[];
  onAction: (userId: number, action: 'activate' | 'suspend' | 'reactivate') => void;
}

const UserTable = ({ users, onAction }: UserTableProps) => (
  <table className="w-full">
    <thead>
      <tr>
        <th>Name</th>
        <th>Email</th>
        <th>Role</th>
        <th>Status</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody>
      {users.map(user => (
        <tr key={user.userId}>
          <td>{user.name}</td>
          <td>{user.email}</td>
          <td>
            <Badge variant={user.role === 'student' ? 'blue' : 'purple'}>
              {user.role}
            </Badge>
          </td>
          <td>
            <Badge variant={
              user.status === 'active' ? 'green' :
              user.status === 'pending' ? 'yellow' : 'red'
            }>
              {user.status}
            </Badge>
          </td>
          <td>
            {user.status === 'pending' && (
              <Button size="sm" onClick={() => onAction(user.userId, 'activate')}>
                Activate
              </Button>
            )}
            {user.status === 'active' && (
              <Button size="sm" variant="destructive" onClick={() => onAction(user.userId, 'suspend')}>
                Suspend
              </Button>
            )}
            {user.status === 'suspended' && (
              <Button size="sm" onClick={() => onAction(user.userId, 'reactivate')}>
                Reactivate
              </Button>
            )}
          </td>
        </tr>
      ))}
    </tbody>
  </table>
);
```

### Notification Creator Component

```typescript
const NotificationCreator = () => {
  const [form, setForm] = useState({
    title: '',
    message: '',
    type: 'general',
    targetType: 'all_campus'
  });

  return (
    <Card className="p-6">
      <h2 className="text-xl font-bold mb-4">Create Notification</h2>
      
      <div className="space-y-4">
        <Input
          label="Title"
          value={form.title}
          onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
          placeholder="Notification title"
        />
        
        <Textarea
          label="Message"
          value={form.message}
          onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
          placeholder="Notification message"
          rows={4}
        />
        
        <Select
          label="Type"
          value={form.type}
          onChange={value => setForm(f => ({ ...f, type: value }))}
        >
          <option value="general">General</option>
          <option value="success">Success</option>
          <option value="warning">Warning</option>
          <option value="urgent">Urgent</option>
        </Select>
        
        <Select
          label="Target Audience"
          value={form.targetType}
          onChange={value => setForm(f => ({ ...f, targetType: value }))}
        >
          <option value="all_campus">All Campus Users</option>
          <option value="all_students">All Students</option>
          <option value="all_supervisors">All Supervisors</option>
          <option value="specific_users">Specific Users</option>
        </Select>
        
        <Button onClick={handleCreate} className="w-full">
          <Send className="mr-2 h-4 w-4" />
          Send Notification
        </Button>
      </div>
    </Card>
  );
};
```

---

## Environment Variables

No additional environment variables required specific to the coordinator module. Uses standard application configuration.

---

## Security Considerations

### 1. Campus Isolation

All coordinator operations are scoped to their assigned campus. A coordinator cannot:
- View or manage users from other campuses
- Send notifications to other campuses
- Access data outside their campus scope

### 2. Role Enforcement

```typescript
// Every coordinator API validates role
if (session.user.role !== 'coordinator') {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
```

### 3. Action Audit Trail

Consider implementing audit logging for coordinator actions:
- User status changes
- Bulk user additions
- Notification broadcasts
