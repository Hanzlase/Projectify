# Coordinators Module Documentation

## Table of Contents
1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Coordinator Registration](#coordinator-registration)
4. [Dashboard Features](#dashboard-features)
5. [User Management](#user-management)
6. [Notification Broadcasting](#notification-broadcasting)
7. [Chat & Communication](#chat--communication)
8. [Profile Management](#profile-management)
9. [API Routes & Endpoints](#api-routes--endpoints)
10. [Database Models](#database-models)
11. [Permissions & Access Control](#permissions--access-control)
12. [System Administration](#system-administration)
13. [Performance Optimizations](#performance-optimizations)

---

## Overview

The Coordinator module provides administrative capabilities for FYP Coordinators to:

1. **Manage Users**: Add, suspend, and manage students and supervisors
2. **Monitor Campus**: View statistics and activity across the campus
3. **Broadcast Notifications**: Send announcements to specific roles or all users
4. **Handle Accounts**: Activate pending accounts, suspend users
5. **Communicate**: Chat with supervisors and students
6. **Campus Administration**: Oversee FYP project workflows

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
  const { targetUserId, action } = body; // action: 'activate', 'suspend', 'reactivate'

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

## Notification Broadcasting

### Notification Creation Flow

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  Coordinator     │     │  Select target   │     │  System creates  │
│  creates         │ --> │  audience        │ --> │  notification +  │
│  notification    │     │  (role/all)      │     │  recipients      │
└──────────────────┘     └──────────────────┘     └──────────────────┘
```

### Target Types

| Target Type | Description |
|-------------|-------------|
| `all_campus` | All users in coordinator's campus |
| `all_students` | All students in campus |
| `all_supervisors` | All supervisors in campus |
| `specific_users` | Selected individual users |

### Notification API (Coordinator Context)

```typescript
// POST /api/notifications
export async function POST(request: NextRequest) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = parseInt(session.user.id);
  const body = await request.json();
  const { title, message, type, targetType, recipientIds } = body;

  // Get coordinator's campus for campus-wide notifications
  let campusId: number | null = null;
  if (session.user.role === 'coordinator') {
    const coordinator = await prisma.fYPCoordinator.findUnique({
      where: { userId }
    });
    campusId = coordinator?.campusId || null;
  }

  // Create notification
  const notification = await prisma.notification.create({
    data: {
      title,
      message,
      type: type || 'general',
      targetType,
      createdById: userId,
      campusId
    }
  });

  // Determine recipients based on targetType
  let recipients: number[] = [];

  switch (targetType) {
    case 'all_campus':
      // Get all users in campus
      const campusStudents = await prisma.student.findMany({
        where: { campusId },
        select: { userId: true }
      });
      const campusSupervisors = await prisma.fYPSupervisor.findMany({
        where: { campusId },
        select: { userId: true }
      });
      recipients = [
        ...campusStudents.map(s => s.userId),
        ...campusSupervisors.map(s => s.userId)
      ];
      break;

    case 'all_students':
      const students = await prisma.student.findMany({
        where: { campusId },
        select: { userId: true }
      });
      recipients = students.map(s => s.userId);
      break;

    case 'all_supervisors':
      const supervisors = await prisma.fYPSupervisor.findMany({
        where: { campusId },
        select: { userId: true }
      });
      recipients = supervisors.map(s => s.userId);
      break;

    case 'specific_users':
      recipients = recipientIds || [];
      break;
  }

  // Create recipient records
  if (recipients.length > 0) {
    await prisma.notificationRecipient.createMany({
      data: recipients.map(recipientUserId => ({
        notificationId: notification.notificationId,
        userId: recipientUserId
      }))
    });
  }

  return NextResponse.json({
    success: true,
    notification,
    recipientCount: recipients.length
  });
}
```

### Notification Management UI

```typescript
// Coordinator notifications page features:
// 1. Create new notification
// 2. View sent notifications
// 3. Track read status

const NotificationsPage = () => {
  const [activeTab, setActiveTab] = useState<'create' | 'sent' | 'received'>('create');
  
  // Create notification form
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [targetType, setTargetType] = useState<string>('all_campus');
  const [notificationType, setNotificationType] = useState<string>('general');

  const handleCreate = async () => {
    await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        message,
        type: notificationType,
        targetType
      })
    });
  };

  // Sent notifications tracking
  const fetchSentNotifications = async () => {
    const response = await fetch('/api/notifications/sent');
    // Shows: notification, recipient count, read count
  };
};
```

---

## Chat & Communication

### Coordinator Chat Capabilities

Coordinators can communicate with:
1. **All Supervisors** in their campus
2. **All Students** in their campus
3. **Individual direct messages**

### Chat User Fetching

```typescript
const fetchChatUsers = async () => {
  // Get all campus users
  const response = await fetch('/api/coordinator/get-users?role=all&status=active');
  
  if (response.ok) {
    const data = await response.json();
    const users = data.users.map((user: any) => ({
      userId: user.userId,
      name: user.name,
      email: user.email,
      role: user.role,
      profileImage: user.profileImage
    }));
    setChatUsers(users);
  }
};
```

### Chat Filters

```typescript
const [chatFilter, setChatFilter] = useState<'all' | 'students' | 'supervisors'>('all');

const filteredConversations = conversations.filter(conv => {
  const matchesSearch = conv.otherUser?.name?.toLowerCase().includes(searchQuery.toLowerCase());
  
  if (chatFilter === 'all') return matchesSearch;
  if (chatFilter === 'students') return matchesSearch && conv.otherUser?.role === 'student';
  if (chatFilter === 'supervisors') return matchesSearch && conv.otherUser?.role === 'supervisor';
  
  return matchesSearch;
});
```

---

## Profile Management

### Coordinator Profile Fields

| Field | Description | Editable |
|-------|-------------|----------|
| Name | Display name | Via User model |
| Email | Contact email | Via User model |
| Profile Image | Avatar | ✅ |
| Description | About section | ✅ |
| Department | Academic department | ✅ |
| Designation | Position title | ✅ |
| Office Hours | Availability | ✅ |

### Profile Component

```typescript
const CoordinatorProfile = () => {
  const [coordinator, setCoordinator] = useState({
    name: '',
    email: '',
    profileImage: null,
    description: '',
    department: '',
    designation: '',
    officeHours: ''
  });

  const handleSave = async () => {
    await fetch('/api/profile/update', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description: coordinator.description,
        department: coordinator.department,
        designation: coordinator.designation,
        officeHours: coordinator.officeHours
      })
    });
  };

  return (
    <div className="space-y-6">
      {/* Profile Image Upload */}
      <ProfileImageUpload 
        currentImage={coordinator.profileImage}
        onUpload={handleImageUpload}
      />
      
      {/* Form Fields */}
      <Input label="Description" value={coordinator.description} multiline />
      <Input label="Department" value={coordinator.department} />
      <Input label="Designation" value={coordinator.designation} />
      <Input label="Office Hours" value={coordinator.officeHours} />
      
      <Button onClick={handleSave}>Save Changes</Button>
    </div>
  );
};
```

---

## API Routes & Endpoints

### Complete Coordinator API Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/coordinator/dashboard` | GET | Campus statistics |
| `/api/coordinator/add-students` | POST | Bulk add students |
| `/api/coordinator/add-supervisors` | POST | Bulk add supervisors |
| `/api/coordinator/get-users` | GET | List campus users |
| `/api/coordinator/manage-user` | POST | User status management |
| `/api/notifications` | GET | Get notifications |
| `/api/notifications` | POST | Create notification |
| `/api/notifications/sent` | GET | Get sent notifications |
| `/api/chat` | GET/POST | Conversations |
| `/api/profile` | GET | Get profile |
| `/api/profile/update` | PUT | Update profile |
| `/api/profile/image` | POST | Upload image |

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
