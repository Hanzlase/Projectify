# Supervisors Module Documentation

## Table of Contents
1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Supervisor Registration](#supervisor-registration)
4. [Dashboard Features](#dashboard-features)
5. [Project Management](#project-management)
6. [Group Supervision](#group-supervision)
7. [Invitations & Requests](#invitations--requests)
8. [Evaluations (Panels + Scoring)](#evaluations-panels--scoring)
9. [Resource Requests Review](#resource-requests-review)
10. [Chat & Communication](#chat--communication)
11. [Profile Management](#profile-management)
12. [API Routes & Endpoints](#api-routes--endpoints)
13. [Database Models](#database-models)
14. [Permissions & Access Control](#permissions--access-control)
15. [Performance Optimizations](#performance-optimizations)

---

## Overview

The Supervisor module provides a comprehensive platform for FYP supervisors to:

1. **Manage Projects**: Create project ideas and proposals with similarity checking
2. **Supervise Groups**: Accept group invitations and guide student teams
3. **Track Progress**: Monitor assigned groups and their projects
4. **Communicate**: Chat with students and coordinators
5. **Handle Requests**: Approve/reject permission requests from students
6. **Evaluations**: Participate in evaluation panels and score group submissions (as supervisor or panel chair)
7. **Resource Requests**: Review and action group resource requests for supervised groups
8. **Profile Management**: Showcase expertise, domains, and availability

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

## Evaluations (Panels + Scoring)

This module implements two supervisor evaluation responsibilities:

1. **Panel participation**: supervisors can be members/chairs of evaluation panels and see assigned groups.
2. **Scoring**: supervisors can score evaluation submissions either as:
   - the group’s **assigned supervisor** (`scoringType` omitted or not `panel`), or
   - the **panel chair** (`scoringType: 'panel'`).

### Fetching panels and group assignments

#### `GET /api/supervisor/evaluations`

**Auth**
- Requires role `supervisor`, else `401 Unauthorized`.

**What it returns**
- `panels[]` where the current supervisor is in `panelMembers`.
- Each panel includes:
  - `panelId`, `panelName`, `status`, `scheduledDate`, `evaluationType`
  - `role` for current supervisor (derived from membership; defaults to `member`)
  - `members[]` (name/email/role/specialization)
  - `groups[]` (flattened from `groupAssignments`) including:
    - `assignmentId`, `groupId`, `groupName`, `students[]`
    - scheduling metadata: `evaluationDate`, `timeSlot`, `venue`
    - scoring fields: `score`, `scoredAt`
    - activity stats computed server-side:
      - `submissionCount` (grouped by `evaluationSubmission`)
      - `commentCount` (grouped by `panelComment`)

**Key implementation notes / constraints**
- The API uses DB aggregation (`groupBy`) for submission and comment counts.
- The returned `group.hasProject` is computed from `!!group.projectId`.

### Scoring an evaluation submission

#### `POST /api/supervisor/evaluations/score-submission`

**Auth**
- Requires role `supervisor`.

**Request body**
- `submissionId` (required)
- `score` (required; validated range)
- `feedback` (optional; trimmed)
- `maxScore` (optional fallback)
- `scoringType` (optional):
  - omit / any value other than `'panel'` → supervisor scoring path
  - `'panel'` → panel chair scoring path

**Validation rules (implemented)**
- `submissionId` required → 400.
- Submission must exist → 404.
- `score` must be within `0..totalMarks`:
  - `totalMarks` is taken from `submission.evaluation.totalMarks` if present,
  - else uses `maxScore` if provided,
  - else defaults to `100`.

**Authorization rules**
- If `scoringType === 'panel'`:
  - caller must be a `panelMember` with `role: 'chair'` for a panel that has the submission’s `groupId` assigned.
  - otherwise `403 Only panel heads can give panel scores`.
  - writes: `panelScore`, `panelFeedback`, `panelScoredById`, `panelScoredAt`.
- Else (supervisor scoring):
  - caller must be the assigned supervisor of the group (`group.supervisorId === userId`).
  - otherwise `403 You are not the supervisor of this group`.
  - writes: `supervisorScore`, `supervisorFeedback`, `supervisorScoredById`, `supervisorScoredAt`.

---

## Resource Requests Review

Supervisors can view all resource requests for groups they supervise and approve/reject them.

#### `GET /api/supervisor/resource-requests`

**Auth**
- Requires role `supervisor`.

**Behavior**
- Finds all groups where `group.supervisorId === currentUserId`.
- If none, returns `{ requests: [] }`.
- Fetches all `resourceRequest` rows for those groups ordered newest-first.
- Enriches with:
  - `groupName`
  - `createdBy` (user name)
  - `items` parsed from JSON

**Edge cases**
- As in the student endpoint, invalid `items` JSON would throw and return `500` (no guard in implementation).

#### `POST /api/supervisor/resource-requests`

**Purpose**: supervisor review action.

**Request body**
- `requestId` (required)
- `action` (required): `'approved' | 'rejected'`
- `note` (optional)

**Authorization and constraints**
- Supervisor must supervise the request’s group, else `403 You don't supervise this group`.
- Only requests with `status === 'pending'` can be reviewed, else `400 Request has already been reviewed`.

**Status transitions (implemented)**
- action `approved` → status becomes `supervisor_approved`
- action `rejected` → status becomes `supervisor_rejected`

Also stores: `supervisorId`, `supervisorNote`, `supervisorAction`, `supervisorReviewedAt`.

---

## API Routes & Endpoints

Add/verify these supervisor-scoped endpoints (in addition to the common project/group/chat/profile endpoints documented in `docs/Common.md`).

| Method | Endpoint | Purpose | Key constraints |
|---|---|---|---|
| GET | `/api/supervisor/dashboard` | Supervisor dashboard snapshot (groups, proposals, stats) | role must be `supervisor` |
| GET | `/api/supervisor/evaluations` | Fetch panel assignments + group stats | role must be `supervisor` |
| POST | `/api/supervisor/evaluations/score-submission` | Score an evaluation submission | score range enforced; supervisor or chair authorization enforced |
| GET/POST | `/api/supervisor/resource-requests` | View and review resource requests | only `pending` can be reviewed; must supervise group |
| GET | `/api/supervisor/get-coordinator` | Fetch campus coordinator contact for this supervisor | role must be `supervisor` |
| GET/PATCH | `/api/supervisor/invitations` | List/respond to group invitations | see route handlers |
| GET/PATCH | `/api/supervisor/invitations/[id]` | Invitation detail/action | see route handlers |

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
