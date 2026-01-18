# Supervisors Module Documentation

## Table of Contents
1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Supervisor Registration](#supervisor-registration)
4. [Dashboard Features](#dashboard-features)
5. [Project Management](#project-management)
6. [Group Supervision](#group-supervision)
7. [Invitations & Requests](#invitations--requests)
8. [Chat & Communication](#chat--communication)
9. [Profile Management](#profile-management)
10. [API Routes & Endpoints](#api-routes--endpoints)
11. [Database Models](#database-models)
12. [Permissions & Access Control](#permissions--access-control)
13. [Performance Optimizations](#performance-optimizations)

---

## Overview

The Supervisor module provides a comprehensive platform for FYP supervisors to:

1. **Manage Projects**: Create project ideas and proposals with similarity checking
2. **Supervise Groups**: Accept group invitations and guide student teams
3. **Track Progress**: Monitor assigned groups and their projects
4. **Communicate**: Chat with students and coordinators
5. **Handle Requests**: Approve/reject permission requests from students
6. **Profile Management**: Showcase expertise, domains, and availability

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        SUPERVISOR FRONTEND PAGES                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  /supervisor/dashboard     - Main overview page                              │
│  /supervisor/projects      - Project management                              │
│  /supervisor/groups        - Supervised groups                               │
│  /supervisor/invitations   - Group invitations                               │
│  /supervisor/students      - View students in groups                         │
│  /supervisor/chat          - Messaging interface                             │
│  /supervisor/profile       - Profile management                              │
│  /supervisor/notifications - Notification center                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            API LAYER                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│  /api/supervisor/dashboard     - Dashboard statistics                        │
│  /api/supervisor/invitations   - Group invitation management                 │
│  /api/supervisor/get-coordinator - Get campus coordinator                    │
│  /api/projects/*               - Project CRUD operations                     │
│  /api/groups/*                 - Group management                            │
│  /api/chat/*                   - Messaging                                   │
│  /api/profile/*                - Profile management                          │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          DATABASE MODELS                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│  FYPSupervisor              - Supervisor profile and limits                  │
│  Project                    - Supervisor's project proposals                 │
│  Group                      - Groups supervised                              │
│  GroupInvitation            - Supervision requests                           │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Supervisor Registration

### Registration Flow (Coordinator adds supervisor)

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  Coordinator     │     │  System creates  │     │  Supervisor      │
│  adds supervisor │ --> │  User + Supervisor│ --> │  receives        │
│  via dashboard   │     │  records         │     │  credentials     │
└──────────────────┘     └──────────────────┘     └──────────────────┘
```

### Supervisor Record Structure

```prisma
model FYPSupervisor {
  supervisorId   Int      @id @default(autoincrement())
  userId         Int      @unique          // Link to User
  campusId       Int                       // Campus affiliation
  description    String?  @db.Text         // About the supervisor
  specialization String?  @db.VarChar(255) // Main expertise area
  domains        String?  @db.Text         // Research domains (comma-separated)
  skills         String?  @db.Text         // Technical skills
  achievements   String?  @db.Text         // Notable achievements
  maxGroups      Int      @default(7)      // Maximum groups to supervise
  totalGroups    Int      @default(0)      // Current number of groups
  revertedBy     Int?                      // Admin who last modified
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  user   User   @relation(fields: [userId], references: [userId], onDelete: Cascade)
  campus Campus @relation(fields: [campusId], references: [campusId])

  @@map("fyp_supervisors")
}
```

---

## Dashboard Features

### Dashboard API (`/api/supervisor/dashboard`)

```typescript
export async function GET() {
  const session = await auth();
  const userId = parseInt(session.user.id);

  // Get supervisor info
  const supervisor = await prisma.fYPSupervisor.findUnique({
    where: { userId },
    include: { campus: true }
  });

  if (!supervisor) {
    return NextResponse.json({ error: 'Supervisor not found' }, { status: 404 });
  }

  // Get groups supervised by this supervisor
  const groupsWithProjects = await prisma.group.findMany({
    where: { supervisorId: userId },
    include: {
      students: {
        include: {
          user: { select: { userId: true, name: true, email: true, profileImage: true } }
        }
      }
    }
  });

  // Get projects for each group
  const groupsWithFullInfo = await Promise.all(
    groupsWithProjects.map(async (group) => {
      let project = null;
      if (group.projectId) {
        project = await prisma.project.findUnique({
          where: { projectId: group.projectId }
        });
      }
      return { ...group, project };
    })
  );

  // Get pending invitations
  const pendingInvitations = await prisma.groupInvitation.count({
    where: {
      inviteeId: userId,
      inviteeRole: 'supervisor',
      status: 'pending'
    }
  });

  // Get supervisor's own projects
  const ownProjects = await prisma.project.findMany({
    where: { createdById: userId }
  });

  // Get recent notifications for activity feed
  const recentNotifications = await prisma.notificationRecipient.findMany({
    where: { userId },
    include: { notification: true },
    orderBy: { createdAt: 'desc' },
    take: 5
  });

  return NextResponse.json({
    supervisor: {
      userId,
      name: session.user.name,
      specialization: supervisor.specialization,
      maxGroups: supervisor.maxGroups,
      totalGroups: groupsWithProjects.length,
      availableSlots: supervisor.maxGroups - groupsWithProjects.length
    },
    stats: {
      totalGroups: groupsWithProjects.length,
      totalStudents: groupsWithProjects.reduce((sum, g) => sum + g.students.length, 0),
      totalProjects: ownProjects.length,
      pendingInvitations
    },
    groups: groupsWithFullInfo,
    recentActivity: recentNotifications.map(nr => ({
      action: nr.notification.title,
      user: nr.notification.message.substring(0, 50),
      time: getRelativeTime(nr.createdAt),
      type: 'info'
    }))
  });
}
```

### Dashboard UI Layout

```
┌────────────────────────────────────────────────────────────────────────────┐
│  Header: "Welcome back, Dr. [Name]!" + NotificationBell                    │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  ┌────────────────────────────────────────────────────────────────────┐   │
│  │                        STATISTICS CARDS                            │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐           │   │
│  │  │ 👥 5     │  │ 👨‍🎓 15   │  │ 📁 8     │  │ ✉️ 3     │           │   │
│  │  │ Groups   │  │ Students │  │ Projects │  │ Pending  │           │   │
│  │  │ Supervised│  │ Mentored │  │ Created  │  │ Invites  │           │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘           │   │
│  └────────────────────────────────────────────────────────────────────┘   │
│                                                                            │
│  ┌─────────────────────────────┐  ┌──────────────────────────────────┐   │
│  │     CAPACITY STATUS         │  │      RECENT ACTIVITY             │   │
│  │                             │  │                                  │   │
│  │  [====------] 5/7 slots    │  │  • Group A submitted proposal    │   │
│  │                             │  │  • New invitation received       │   │
│  │  Available: 2 groups        │  │  • Student John messaged you     │   │
│  └─────────────────────────────┘  └──────────────────────────────────┘   │
│                                                                            │
│  ┌────────────────────────────────────────────────────────────────────┐   │
│  │                    SUPERVISED GROUPS                               │   │
│  │  ┌────────────────────────────────────────────────────────────┐   │   │
│  │  │ Group: Smart Campus                    Status: In Progress  │   │   │
│  │  │ Members: Alice, Bob, Charlie                                │   │   │
│  │  │ Project: Smart Campus Navigation System                     │   │   │
│  │  │                                    [View Details] [Chat]    │   │   │
│  │  └────────────────────────────────────────────────────────────┘   │   │
│  │  ┌────────────────────────────────────────────────────────────┐   │   │
│  │  │ Group: AI Healthcare                   Status: Idea Phase   │   │   │
│  │  │ ...                                                         │   │   │
│  │  └────────────────────────────────────────────────────────────┘   │   │
│  └────────────────────────────────────────────────────────────────────┘   │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## Project Management

### Supervisor Project Capabilities

Supervisors can create project proposals that students can:
1. Browse and discover
2. Request permission to use
3. Select for their group

### Project Creation Flow (Same as Students)

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  Supervisor      │     │  Upload document │     │  System runs     │
│  clicks "New     │ --> │  (PDF/DOCX)      │ --> │  similarity      │
│  Project"        │     │                  │     │  check           │
└──────────────────┘     └──────────────────┘     └──────────────────┘
                                                          │
                                                          ▼
                                               ┌──────────────────┐
                                               │  Similarity      │
                                               │  Results +       │
                                               │  Feasibility     │
                                               └──────────────────┘
                                                          │
                                                          ▼
                                               ┌──────────────────┐
                                               │  Save Project    │
                                               │  (Public/Private)│
                                               └──────────────────┘
```

### Project Visibility Options

| Visibility | Description |
|------------|-------------|
| `private` | Only supervisor can see |
| `public` | All campus students can browse |

### Permission Request Handling

When a student requests permission to use a supervisor's project:

```typescript
// PUT /api/projects/[id]/permission
export async function PUT(request: NextRequest, { params }) {
  const session = await auth();
  const userId = parseInt(session.user.id);
  const projectId = parseInt(params.id);
  const { requesterId, status } = await request.json();

  // Verify user owns the project
  const project = await prisma.project.findUnique({
    where: { projectId }
  });

  if (project.createdById !== userId) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  // Update permission request
  await prisma.projectPermissionRequest.update({
    where: {
      projectId_requesterId: { projectId, requesterId }
    },
    data: { status }
  });

  // Notify the student
  await prisma.notification.create({
    data: {
      title: `Permission Request ${status === 'approved' ? 'Approved' : 'Rejected'}`,
      message: `Your permission request for "${project.title}" has been ${status}.`,
      type: status === 'approved' ? 'success' : 'general',
      targetType: 'specific_users',
      createdById: userId,
      recipients: {
        create: { userId: requesterId }
      }
    }
  });

  return NextResponse.json({ success: true });
}
```

---

## Group Supervision

### Groups Page (`/supervisor/groups`)

**Features:**
- View all supervised groups
- See group members and their profiles
- View project status and progress
- Access group chat
- Navigate to student profiles

### Group Card Component

```typescript
interface GroupCardProps {
  group: {
    groupId: number;
    groupName: string;
    students: Array<{
      userId: number;
      name: string;
      email: string;
      rollNumber: string;
      profileImage: string | null;
    }>;
    project: {
      projectId: number;
      title: string;
      status: 'idea' | 'in_progress' | 'completed';
    } | null;
    conversationId: number | null;
  };
}

// Group card displays:
// - Group name
// - Project title and status
// - Member avatars (up to 4 visible, "+N" for more)
// - Quick actions: [View Details] [Chat]
```

### Students Page (`/supervisor/students`)

Provides a consolidated view of all students across supervised groups:

**Features:**
- List all students the supervisor mentors
- Search and filter
- View student profiles
- Contact via chat
- See group assignment

---

## Invitations & Requests

### Invitation Types Received

1. **Group Supervision Invitations**
   - From students who created a group
   - Accept to become group supervisor
   - Auto-added to group chat on acceptance

2. **Permission Requests** (via Notifications)
   - Students requesting to use supervisor's project
   - Approve or reject from notification detail

### Invitations Page (`/supervisor/invitations`)

**Features:**
- View pending group invitations
- See group details before accepting
- Accept/reject invitations
- View history of responded invitations

### Invitation API (`/api/supervisor/invitations`)

```typescript
// GET /api/supervisor/invitations
export async function GET(request: NextRequest) {
  const session = await auth();
  const userId = parseInt(session.user.id);

  const invitations = await prisma.groupInvitation.findMany({
    where: {
      inviteeId: userId,
      inviteeRole: 'supervisor'
    },
    include: {
      group: {
        include: {
          students: {
            include: {
              user: { select: { name: true, email: true, profileImage: true } }
            }
          }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  // Get project info for each group
  const invitationsWithProjects = await Promise.all(
    invitations.map(async (inv) => {
      let project = null;
      if (inv.group.projectId) {
        project = await prisma.project.findUnique({
          where: { projectId: inv.group.projectId },
          select: { projectId: true, title: true, description: true }
        });
      }
      return { ...inv, project };
    })
  );

  return NextResponse.json({ invitations: invitationsWithProjects });
}
```

### Accepting Group Invitation

```typescript
// PATCH /api/supervisor/invitations/[id]
export async function PATCH(request: NextRequest, { params }) {
  const session = await auth();
  const userId = parseInt(session.user.id);
  const invitationId = parseInt(params.id);
  const { action } = await request.json(); // 'accept' or 'reject'

  const invitation = await prisma.groupInvitation.findUnique({
    where: { id: invitationId },
    include: { group: true }
  });

  // Validate invitation belongs to this supervisor
  if (invitation.inviteeId !== userId || invitation.inviteeRole !== 'supervisor') {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  if (action === 'accept') {
    // Check supervisor capacity
    const supervisor = await prisma.fYPSupervisor.findUnique({
      where: { userId }
    });
    
    const currentGroups = await prisma.group.count({
      where: { supervisorId: userId }
    });
    
    if (currentGroups >= supervisor.maxGroups) {
      return NextResponse.json({ 
        error: 'You have reached your maximum group limit' 
      }, { status: 400 });
    }

    // Assign supervisor to group
    await prisma.group.update({
      where: { groupId: invitation.groupId },
      data: { supervisorId: userId }
    });

    // Add to group chat
    const groupChat = await prisma.groupChat.findFirst({
      where: { groupId: invitation.groupId }
    });

    if (groupChat) {
      await prisma.conversationParticipant.create({
        data: {
          conversationId: groupChat.conversationId,
          userId
        }
      });

      // Send join message
      await prisma.message.create({
        data: {
          conversationId: groupChat.conversationId,
          senderId: userId,
          content: `🎓 ${session.user.name} (Supervisor) has joined the group!`
        }
      });
    }

    // Notify group members
    const groupStudents = await prisma.student.findMany({
      where: { groupId: invitation.groupId },
      select: { userId: true }
    });

    await prisma.notification.create({
      data: {
        title: 'Supervisor Joined',
        message: `${session.user.name} has accepted to supervise your group!`,
        type: 'success',
        targetType: 'specific_users',
        createdById: userId,
        recipients: {
          create: groupStudents.map(s => ({ userId: s.userId }))
        }
      }
    });
  }

  // Update invitation status
  await prisma.groupInvitation.update({
    where: { id: invitationId },
    data: { status: action === 'accept' ? 'accepted' : 'rejected' }
  });

  return NextResponse.json({ success: true });
}
```

---

## Chat & Communication

### Supervisor Chat Features

Supervisors can communicate with:
1. **Students in their groups** (group chat)
2. **Individual students** (direct messages)
3. **Coordinators** (direct messages)

### Chat Filters

```typescript
const [chatFilter, setChatFilter] = useState<'all' | 'students' | 'coordinator' | 'groups'>('all');

const filteredConversations = conversations.filter(conv => {
  const matchesSearch = conv.otherUser?.name?.toLowerCase().includes(searchQuery.toLowerCase());
  
  if (chatFilter === 'all') return matchesSearch;
  if (chatFilter === 'students') return matchesSearch && conv.otherUser?.role === 'student';
  if (chatFilter === 'coordinator') return matchesSearch && conv.otherUser?.role === 'coordinator';
  if (chatFilter === 'groups') return false; // Groups shown separately
  
  return matchesSearch;
});
```

### Starting Conversations

```typescript
// Fetch available chat users
const fetchChatUsers = async () => {
  setLoadingUsers(true);
  try {
    // Get students from supervised groups
    const groupsResponse = await fetch('/api/groups');
    if (groupsResponse.ok) {
      const data = await groupsResponse.json();
      const users: ChatUser[] = [];
      
      data.groups.forEach((group: any) => {
        group.students.forEach((student: any) => {
          if (!users.some(u => u.userId === student.userId)) {
            users.push({
              userId: student.userId,
              name: student.user.name,
              email: student.user.email,
              role: 'student',
              profileImage: student.user.profileImage
            });
          }
        });
      });
      
      setChatUsers(users);
    }
    
    // Also get coordinator
    const coordResponse = await fetch('/api/supervisor/get-coordinator');
    if (coordResponse.ok) {
      const coordData = await coordResponse.json();
      if (coordData.coordinator) {
        setChatUsers(prev => [...prev, {
          userId: coordData.coordinator.userId,
          name: coordData.coordinator.name,
          email: coordData.coordinator.email,
          role: 'coordinator',
          profileImage: coordData.coordinator.profileImage
        }]);
      }
    }
  } finally {
    setLoadingUsers(false);
  }
};
```

---

## Profile Management

### Supervisor Profile Fields

| Field | Description | Editable |
|-------|-------------|----------|
| Name | Display name | Via User model |
| Email | Contact email | Via User model |
| Profile Image | Avatar | ✅ |
| Description | About section | ✅ |
| Specialization | Primary expertise | ✅ |
| Domains | Research domains | ✅ |
| Skills | Technical skills | ✅ |
| Achievements | Notable accomplishments | ✅ |
| Max Groups | Group limit | By Coordinator |
| Total Groups | Current groups | Auto-calculated |

### Profile Update API

```typescript
// PUT /api/profile/update
export async function PUT(request: NextRequest) {
  const session = await auth();
  const userId = parseInt(session.user.id);
  const body = await request.json();

  if (session.user.role === 'supervisor') {
    const { description, specialization, domains, skills, achievements } = body;
    
    await prisma.fYPSupervisor.update({
      where: { userId },
      data: {
        description,
        specialization,
        domains,
        skills,
        achievements
      }
    });
  }

  return NextResponse.json({ success: true });
}
```

---

## API Routes & Endpoints

### Complete Supervisor API Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/supervisor/dashboard` | GET | Dashboard statistics |
| `/api/supervisor/invitations` | GET | Get group invitations |
| `/api/supervisor/invitations/[id]` | PATCH | Accept/reject invitation |
| `/api/supervisor/get-coordinator` | GET | Get campus coordinator |
| `/api/projects` | GET | List supervisor's projects |
| `/api/projects` | POST | Create project |
| `/api/projects/[id]` | GET/PUT/DELETE | Project CRUD |
| `/api/projects/check-similarity` | POST | Check similarity |
| `/api/projects/[id]/permission` | PUT | Handle permission request |
| `/api/groups` | GET | Get supervised groups |
| `/api/chat` | GET/POST | Conversations |
| `/api/profile` | GET | Get profile |
| `/api/profile/update` | PUT | Update profile |
| `/api/profile/image` | POST | Upload image |
| `/api/notifications` | GET | Get notifications |

---

## Database Models

### FYPSupervisor Model

```prisma
model FYPSupervisor {
  supervisorId   Int      @id @default(autoincrement())
  userId         Int      @unique
  campusId       Int
  description    String?  @db.Text
  specialization String?  @db.VarChar(255)
  domains        String?  @db.Text
  skills         String?  @db.Text
  achievements   String?  @db.Text
  maxGroups      Int      @default(7)
  totalGroups    Int      @default(0)
  revertedBy     Int?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  user   User   @relation(fields: [userId], references: [userId], onDelete: Cascade)
  campus Campus @relation(fields: [campusId], references: [campusId])

  @@map("fyp_supervisors")
}
```

### Group Model (Supervisor Perspective)

```prisma
model Group {
  groupId      Int      @id @default(autoincrement())
  groupName    String?  @db.VarChar(255)
  projectId    Int?     @unique
  createdById  Int                      // Student who created
  supervisorId Int?                     // Assigned supervisor user ID
  isFull       Boolean  @default(false)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  students         Student[]
  groupChats       GroupChat[]
  groupInvitations GroupInvitation[]

  @@map("groups")
}
```

---

## Permissions & Access Control

### Supervisor Permissions Matrix

| Resource | View | Create | Edit | Delete |
|----------|------|--------|------|--------|
| Own Profile | ✅ | - | ✅ | - |
| Own Projects | ✅ | ✅ | ✅ | ✅ |
| Student Projects (supervised) | ✅ | - | - | - |
| Supervised Groups | ✅ | - | - | - |
| Students in Groups | ✅ | - | - | - |
| Group Invitations | ✅ | - | - | - |
| Notifications | ✅ | - | - | ✅ |
| Permission Requests | ✅ | - | ✅* | - |

*Can approve/reject permission requests for own projects

### Access Validation Pattern

```typescript
// Standard supervisor access check
export async function GET(request: NextRequest) {
  const session = await auth();
  
  // 1. Authentication
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // 2. Role verification
  if (session.user.role !== 'supervisor') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  
  // 3. Resource access (e.g., check if supervisor of this group)
  const group = await prisma.group.findUnique({
    where: { groupId: parseInt(params.groupId) }
  });
  
  if (group.supervisorId !== parseInt(session.user.id)) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }
  
  // 4. Proceed
}
```

---

## Performance Optimizations

### 1. Dashboard Data Loading

```typescript
// Parallel queries for dashboard
const [supervisor, groups, invitations, projects] = await Promise.all([
  prisma.fYPSupervisor.findUnique({ where: { userId }, include: { campus: true } }),
  prisma.group.findMany({ where: { supervisorId: userId }, include: { students: {...} } }),
  prisma.groupInvitation.count({ where: { inviteeId: userId, status: 'pending' } }),
  prisma.project.count({ where: { createdById: userId } })
]);
```

### 2. Efficient Group Loading

```typescript
// Get all group data in minimal queries
const groups = await prisma.group.findMany({
  where: { supervisorId: userId },
  include: {
    students: {
      include: {
        user: {
          select: { userId: true, name: true, email: true, profileImage: true }
        }
      }
    },
    groupChats: {
      select: { conversationId: true }
    }
  }
});

// Batch project fetching
const projectIds = groups.map(g => g.projectId).filter(Boolean);
const projects = await prisma.project.findMany({
  where: { projectId: { in: projectIds } }
});

// Map projects to groups
const groupsWithProjects = groups.map(group => ({
  ...group,
  project: projects.find(p => p.projectId === group.projectId) || null
}));
```

### 3. Caching Coordinator Info

```typescript
// Cache coordinator info (doesn't change often)
const [cachedCoordinator, setCachedCoordinator] = useState(null);

const fetchCoordinator = async () => {
  if (cachedCoordinator) return cachedCoordinator;
  
  const response = await fetch('/api/supervisor/get-coordinator');
  if (response.ok) {
    const data = await response.json();
    setCachedCoordinator(data.coordinator);
    return data.coordinator;
  }
};
```

---

## UI Components

### SupervisorSidebar

```typescript
const sidebarItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/supervisor/dashboard' },
  { icon: FolderKanban, label: 'Projects', path: '/supervisor/projects' },
  { icon: Users, label: 'Groups', path: '/supervisor/groups' },
  { icon: GraduationCap, label: 'Students', path: '/supervisor/students' },
  { icon: MessageSquare, label: 'Chat', path: '/supervisor/chat' },
  { icon: Mail, label: 'Invitations', path: '/supervisor/invitations' },
  { icon: Bell, label: 'Notifications', path: '/supervisor/notifications' },
  { icon: User, label: 'Profile', path: '/supervisor/profile' },
];
```

### Capacity Indicator Component

```typescript
// Visual indicator for group capacity
const CapacityIndicator = ({ current, max }: { current: number; max: number }) => {
  const percentage = (current / max) * 100;
  const isNearLimit = percentage >= 80;
  const isFull = current >= max;

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span>Groups Supervised</span>
        <span className={isFull ? 'text-red-500' : isNearLimit ? 'text-amber-500' : 'text-green-500'}>
          {current}/{max}
        </span>
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all ${
            isFull ? 'bg-red-500' : isNearLimit ? 'bg-amber-500' : 'bg-green-500'
          }`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      <p className="text-xs text-gray-500">
        {isFull 
          ? 'No available slots' 
          : `${max - current} slot${max - current !== 1 ? 's' : ''} available`
        }
      </p>
    </div>
  );
};
```

---

## Environment Variables

No additional environment variables required specific to the supervisor module. Uses standard application configuration.
