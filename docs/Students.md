# Students Module Documentation

## Table of Contents
1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Student Registration & Onboarding](#student-registration--onboarding)
4. [Dashboard Features](#dashboard-features)
5. [Project Management](#project-management)
6. [Group Management](#group-management)
7. [Browsing Features](#browsing-features)
8. [Invitations System](#invitations-system)
9. [Profile Management](#profile-management)
10. [API Routes & Endpoints](#api-routes--endpoints)
11. [Database Models](#database-models)
12. [Permissions & Access Control](#permissions--access-control)
13. [Performance Optimizations](#performance-optimizations)

---

## Overview

The Student module is the core user-facing component of Projectify, providing:

1. **Dashboard**: Overview of group status, project, and campus statistics
2. **Project Management**: Create, upload, and manage FYP projects with similarity checking
3. **Group Formation**: Create groups, invite members, and manage team composition
4. **Supervisor Discovery**: Browse and invite supervisors based on expertise
5. **Peer Networking**: Find and connect with fellow students
6. **Invitations**: Manage received and sent invitations
7. **Chat**: Communicate with group members, supervisors, and peers

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         STUDENT FRONTEND PAGES                               │
├─────────────────────────────────────────────────────────────────────────────┤
│  /student/dashboard        - Main overview page                             │
│  /student/projects         - Project management                             │
│  /student/projects/[id]    - Project details                                │
│  /student/group            - Group management                               │
│  /student/invitations      - Invitation management                          │
│  /student/browse-students  - Find classmates                                │
│  /student/browse-supervisors - Find supervisors                             │
│  /student/chat             - Messaging interface                            │
│  /student/profile          - Profile management                             │
│  /student/notifications    - Notification center                            │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         API LAYER                                            │
├─────────────────────────────────────────────────────────────────────────────┤
│  /api/student/dashboard    - Dashboard statistics                           │
│  /api/student/search-users - Search students/supervisors                    │
│  /api/projects/*           - Project CRUD operations                        │
│  /api/groups/*             - Group management                               │
│  /api/invitations/*        - Invitation handling                            │
│  /api/profile/*            - Profile management                             │
│  /api/chat/*               - Messaging                                      │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DATABASE MODELS                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│  Student                   - Student profile and group membership           │
│  Project                   - FYP projects with embeddings                   │
│  Group                     - Group composition                              │
│  GroupInvitation           - Group invitations                              │
│  Invitation                - Student-to-student invitations                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Student Registration & Onboarding

### Registration Flow (Coordinator adds student)

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  Coordinator     │     │  System creates  │     │  Student         │
│  adds student    │ --> │  User + Student  │ --> │  receives        │
│  via dashboard   │     │  records         │     │  credentials     │
└──────────────────┘     └──────────────────┘     └──────────────────┘
```

### Student Record Structure

```prisma
model Student {
  studentId    Int      @id @default(autoincrement())
  userId       Int      @unique          // Link to User
  rollNumber   String   @unique          // Unique identifier
  batch        String?                   // e.g., "2021-2025"
  campusId     Int                       // Campus affiliation
  groupId      Int?                      // Current group (null if not in group)
  isGroupAdmin Boolean  @default(false)  // Admin of their group
  gpa          Float?                    // Academic standing
  skills       String?  @db.Text         // Comma-separated skills
  interests    String?  @db.Text         // Research interests
  bio          String?  @db.Text         // Personal bio
  linkedin     String?                   // LinkedIn profile URL
  github       String?                   // GitHub profile URL
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  user   User   @relation(fields: [userId], references: [userId])
  campus Campus @relation(fields: [campusId], references: [campusId])
  group  Group? @relation(fields: [groupId], references: [groupId])
  
  sentInvitations     Invitation[] @relation("SentInvitations")
  receivedInvitations Invitation[] @relation("ReceivedInvitations")
}
```

---

## Dashboard Features

### Dashboard API (`/api/student/dashboard`)

```typescript
export async function GET() {
  const session = await auth();
  const userId = parseInt(session.user.id);

  // Get student with campus and group info
  const student = await prisma.student.findUnique({
    where: { userId },
    include: {
      campus: true,
      group: {
        include: {
          students: {
            include: { user: { select: { userId, name, email, profileImage } } }
          }
        }
      }
    }
  });

  // Get supervisors in same campus
  const supervisors = await prisma.fYPSupervisor.findMany({
    where: { campusId: student.campusId },
    include: { user: { select: { userId, name, email, profileImage } } }
  });

  // Get fellow students (excluding self)
  const fellowStudents = await prisma.student.findMany({
    where: {
      campusId: student.campusId,
      userId: { not: userId }
    },
    include: { user: { select: {...} }, group: true },
    take: 50
  });

  // Calculate statistics
  const totalSupervisors = await prisma.fYPSupervisor.count({
    where: { campusId: student.campusId }
  });

  const totalStudents = await prisma.student.count({
    where: { campusId: student.campusId }
  });

  const pendingInvitations = await prisma.invitation.count({
    where: { receiverId: student.studentId, status: 'pending' }
  });

  const totalProjects = await prisma.project.count({
    where: { campusId: student.campusId }
  });

  return NextResponse.json({
    student: { ... },
    supervisors: [ ... ],
    fellowStudents: [ ... ],
    stats: {
      totalSupervisors,
      totalStudents,
      pendingInvitations,
      totalProjects
    }
  });
}
```

### Dashboard UI Components

```
┌────────────────────────────────────────────────────────────────────────────┐
│  Header: "Welcome back, [Student Name]!" + NotificationBell                │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  ┌────────────────────────────────────────────────────────────────────┐   │
│  │                        STATISTICS CARDS                            │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐           │   │
│  │  │ 👥 50    │  │ 🎓 12    │  │ 📋 5     │  │ 📁 25    │           │   │
│  │  │ Students │  │ Supervisors│  │ Invites │  │ Projects │           │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘           │   │
│  └────────────────────────────────────────────────────────────────────┘   │
│                                                                            │
│  ┌─────────────────────────────┐  ┌──────────────────────────────────┐   │
│  │     GROUP STATUS            │  │      YOUR PROJECT                │   │
│  │                             │  │                                  │   │
│  │  [Group Name]               │  │  [Project Title]                 │   │
│  │  Members: 3/3               │  │  Status: In Progress             │   │
│  │  Supervisor: Dr. Smith      │  │  Similarity: ✅ Unique           │   │
│  │                             │  │                                  │   │
│  │  [View Group] [Chat]        │  │  [View Details]                  │   │
│  └─────────────────────────────┘  └──────────────────────────────────┘   │
│                                                                            │
│  ┌────────────────────────────────────────────────────────────────────┐   │
│  │                    AVAILABLE SUPERVISORS                           │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐   │   │
│  │  │ Dr. Smith  │  │ Dr. Jones  │  │ Dr. Wilson │  │ Dr. Brown  │   │   │
│  │  │ AI/ML      │  │ Web Dev    │  │ Security   │  │ Data Sci   │   │   │
│  │  │ [View]     │  │ [View]     │  │ [View]     │  │ [View]     │   │   │
│  │  └────────────┘  └────────────┘  └────────────┘  └────────────┘   │   │
│  └────────────────────────────────────────────────────────────────────┘   │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## Project Management

### Project Creation Flow

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  Student clicks  │     │  Upload document │     │  System runs     │
│  "New Project"   │ --> │  (PDF/DOCX)      │ --> │  similarity      │
│                  │     │                  │     │  check           │
└──────────────────┘     └──────────────────┘     └──────────────────┘
                                                          │
         ┌────────────────────────────────────────────────┼────────┐
         │                                                │        │
         ▼                                                ▼        ▼
┌──────────────────┐                             ┌──────────────────┐
│  Project UNIQUE  │                             │  Project SIMILAR │
│  • Show results  │                             │  • Show overlaps │
│  • Allow save    │                             │  • Show reasons  │
│  • Generate      │                             │  • Suggest diff  │
│    feasibility   │                             │  • Allow anyway  │
└──────────────────┘                             └──────────────────┘
         │                                                │
         └────────────────────────┬───────────────────────┘
                                  │
                                  ▼
                    ┌──────────────────────────┐
                    │  POST /api/projects      │
                    │  • Save to database      │
                    │  • Store embedding       │
                    │  • Save feasibility      │
                    └──────────────────────────┘
```

### Project Listing Page

**Features:**
- View all personal projects
- Filter by status (idea, in_progress, completed)
- Search by title
- Create new project
- Upload project document

### Project Detail Page (`/student/projects/[id]`)

**Features:**
- View full project details
- View/generate feasibility report
- Request permission for supervisor projects
- Edit project (if owner)
- Delete project (if owner and not assigned to group)

### Project API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/projects` | GET | List user's projects |
| `/api/projects` | POST | Create new project |
| `/api/projects/[id]` | GET | Get project details |
| `/api/projects/[id]` | PUT | Update project |
| `/api/projects/[id]` | DELETE | Delete project |
| `/api/projects/check-similarity` | POST | Check document similarity |
| `/api/projects/upload` | POST | Upload project files to R2 |
| `/api/projects/[id]/feasibility` | GET | Get feasibility report |
| `/api/projects/[id]/permission` | POST | Request permission |
| `/api/projects/[id]/permission` | PUT | Grant/deny permission |

---

## Group Management

### Group States

| State | Description |
|-------|-------------|
| No Group | Student hasn't created or joined a group |
| Creating Group | Student is selecting project and inviting members |
| In Group | Student is part of a group |
| Group Full | 3 students + 1 supervisor assigned |

### Group Creation From Chat Page

The group creation interface is integrated into the chat page:

```typescript
// Group creation flow
const createGroup = async () => {
  if (!selectedProject || selectedMembers.length === 0 || !selectedSupervisor) {
    alert('Please select a project, at least one member, and a supervisor');
    return;
  }

  const response = await fetch('/api/groups', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      projectId: selectedProject.projectId,
      studentUserIds: selectedMembers.map(m => m.userId),
      supervisorUserId: selectedSupervisor.userId
    })
  });

  if (response.ok) {
    const data = await response.json();
    // Group created with conversation
    // Invitations sent to selected members and supervisor
    // Creator becomes group admin
    if (data.group?.conversationId) {
      selectConversation(data.group.conversationId);
    }
  }
};
```

### Group Management Features

**For Group Admin (Creator):**
- View group members
- See pending invitations
- Cancel sent invitations
- View group project
- Access group chat

**For Group Members:**
- View group information
- Access group chat
- Leave group (TBD)

---

## Browsing Features

### Browse Supervisors (`/student/browse-supervisors`)

**Purpose:** Find and learn about supervisors in the campus

**Features:**
- Search by name, specialization, or domains
- Filter by availability (slots remaining)
- View supervisor profiles with:
  - Specialization
  - Research domains
  - Skills
  - Current groups / Max groups
  - Contact options
- Invite supervisor to group (if group admin)

### Browse Students (`/student/browse-students`)

**Purpose:** Find potential group members

**Features:**
- Search by name, roll number, or skills
- Filter by availability (not in a group)
- View student profiles with:
  - Skills and interests
  - GPA (if shared)
  - GitHub/LinkedIn links
- Send group invitation
- Start direct chat

### Search API (`/api/student/search-users`)

```typescript
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query') || '';
  const type = searchParams.get('type') || 'all'; // 'students', 'supervisors', 'all'

  const userId = parseInt(session.user.id);
  
  // Get student's campus
  const student = await prisma.student.findUnique({
    where: { userId },
    select: { campusId: true }
  });

  let results: any[] = [];

  if (type === 'students' || type === 'all') {
    const students = await prisma.student.findMany({
      where: {
        campusId: student.campusId,
        userId: { not: userId },
        OR: [
          { user: { name: { contains: query, mode: 'insensitive' } } },
          { rollNumber: { contains: query, mode: 'insensitive' } },
          { skills: { contains: query, mode: 'insensitive' } }
        ]
      },
      include: { user: { select: {...} } }
    });
    results.push(...students);
  }

  if (type === 'supervisors' || type === 'all') {
    const supervisors = await prisma.fYPSupervisor.findMany({
      where: {
        campusId: student.campusId,
        OR: [
          { user: { name: { contains: query, mode: 'insensitive' } } },
          { specialization: { contains: query, mode: 'insensitive' } },
          { domains: { contains: query, mode: 'insensitive' } }
        ]
      },
      include: { user: { select: {...} } }
    });
    results.push(...supervisors);
  }

  return NextResponse.json({ results });
}
```

---

## Invitations System

### Types of Invitations

1. **Student-to-Student Invitations** (Legacy `Invitation` model)
   - Direct invitations between students
   - Used for collaboration requests

2. **Group Invitations** (`GroupInvitation` model)
   - Invitations to join a group
   - Can be sent to students or supervisors

### Invitations Page Features

**Tabs:**
- **Received**: Invitations waiting for response
- **Sent**: Invitations the student has sent

**Actions:**
- Accept invitation (join group)
- Decline invitation
- Cancel sent invitation

### Fetching Invitations

```typescript
// Frontend: Fetch both invitation types
const fetchInvitations = async () => {
  // Fetch regular invitations
  const regularResponse = await fetch('/api/invitations');
  const regularData = await regularResponse.json();
  
  // Fetch group invitations
  const groupResponse = await fetch(`/api/groups/invitations?type=${activeTab}`);
  const groupData = await groupResponse.json();
  
  // Merge and format
  const allInvitations = [
    ...regularData.invitations.map(inv => ({
      ...inv,
      isGroupInvitation: false
    })),
    ...groupData.invitations.map(inv => ({
      id: inv.id,
      sender: inv.inviter,
      receiver: inv.invitee,
      message: inv.message,
      status: inv.status,
      createdAt: inv.createdAt,
      isGroupInvitation: true,
      groupName: inv.group?.groupName,
      groupId: inv.groupId
    }))
  ];
  
  setInvitations(allInvitations);
};
```

### Handling Invitation Actions

```typescript
const handleInvitationAction = async (invitationId: number, action: 'accept' | 'reject', isGroupInvitation: boolean) => {
  const endpoint = isGroupInvitation
    ? '/api/groups/invitations'
    : '/api/invitations';
  
  const response = await fetch(endpoint, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ invitationId, action })
  });
  
  if (response.ok) {
    // Refresh invitations list
    fetchInvitations();
    // If accepted group invitation, user is now in a group
  }
};
```

---

## Profile Management

### Profile Page (`/student/profile`)

**Viewable Information:**
- Name, email, roll number
- Campus and batch
- Profile image
- Skills and interests
- Bio
- GPA (optional)
- LinkedIn and GitHub links

**Editable Information:**
- Profile image (upload)
- Skills
- Interests
- Bio
- GPA
- Social links

### Profile API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/profile` | GET | Get current user's profile |
| `/api/profile/update` | PUT | Update profile fields |
| `/api/profile/image` | POST | Upload profile image |

### Profile Update

```typescript
// PUT /api/profile/update
export async function PUT(request: NextRequest) {
  const session = await auth();
  const userId = parseInt(session.user.id);
  const { skills, interests, bio, gpa, linkedin, github } = await request.json();

  await prisma.student.update({
    where: { userId },
    data: {
      skills,
      interests,
      bio,
      gpa: gpa ? parseFloat(gpa) : null,
      linkedin,
      github
    }
  });

  return NextResponse.json({ success: true });
}
```

---

## API Routes & Endpoints

### Complete Student API Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/student/dashboard` | GET | Dashboard statistics |
| `/api/student/search-users` | GET | Search students/supervisors |
| `/api/projects` | GET | List projects |
| `/api/projects` | POST | Create project |
| `/api/projects/[id]` | GET/PUT/DELETE | Project CRUD |
| `/api/projects/check-similarity` | POST | Check similarity |
| `/api/projects/upload` | POST | Upload files |
| `/api/projects/[id]/feasibility` | GET | Get feasibility report |
| `/api/projects/[id]/permission` | POST | Request permission |
| `/api/groups` | GET | Get student's group |
| `/api/groups` | POST | Create group |
| `/api/groups/invitations` | GET | Get invitations |
| `/api/groups/invitations` | PATCH | Accept/reject invitation |
| `/api/groups/invitations` | DELETE | Cancel invitation |
| `/api/invitations` | GET | Get student invitations |
| `/api/invitations/[id]` | PATCH | Accept/reject |
| `/api/profile` | GET | Get profile |
| `/api/profile/update` | PUT | Update profile |
| `/api/profile/image` | POST | Upload image |
| `/api/chat` | GET/POST | Conversations |
| `/api/notifications` | GET | Get notifications |

---

## Database Models

### Student Model

```prisma
model Student {
  studentId    Int      @id @default(autoincrement())
  userId       Int      @unique
  rollNumber   String   @unique @db.VarChar(50)
  batch        String?  @db.VarChar(20)
  campusId     Int
  groupId      Int?
  isGroupAdmin Boolean  @default(false)
  gpa          Float?
  skills       String?  @db.Text
  interests    String?  @db.Text
  bio          String?  @db.Text
  linkedin     String?  @db.VarChar(255)
  github       String?  @db.VarChar(255)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  user   User   @relation(fields: [userId], references: [userId], onDelete: Cascade)
  campus Campus @relation(fields: [campusId], references: [campusId])
  group  Group? @relation(fields: [groupId], references: [groupId])
  
  sentInvitations     Invitation[] @relation("SentInvitations")
  receivedInvitations Invitation[] @relation("ReceivedInvitations")

  @@map("students")
}
```

### Invitation Model (Student-to-Student)

```prisma
model Invitation {
  invitationId  Int              @id @default(autoincrement())
  senderId      Int
  receiverId    Int
  message       String?          @db.Text
  status        InvitationStatus @default(pending)
  type          InvitationType   @default(group_invite)
  createdAt     DateTime         @default(now())
  updatedAt     DateTime         @updatedAt

  sender   Student @relation("SentInvitations", fields: [senderId], references: [studentId])
  receiver Student @relation("ReceivedInvitations", fields: [receiverId], references: [studentId])

  @@unique([senderId, receiverId, type])
  @@map("invitations")
}
```

---

## Permissions & Access Control

### Student Permissions Matrix

| Resource | View | Create | Edit | Delete |
|----------|------|--------|------|--------|
| Own Profile | ✅ | - | ✅ | - |
| Own Projects | ✅ | ✅ | ✅ | ✅* |
| Other's Public Projects | ✅ | - | - | - |
| Own Group | ✅ | ✅** | ✅** | - |
| Invitations | ✅ | ✅ | - | ✅ |
| Notifications | ✅ | - | - | ✅ |
| Chat Messages | ✅ | ✅ | - | ✅*** |

*Cannot delete if project is assigned to a group
**Only if not already in a group
***Only own messages

### Access Validation Pattern

```typescript
// Standard access check pattern
export async function GET(request: NextRequest, { params }) {
  const session = await auth();
  
  // 1. Authentication check
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // 2. Role check (if needed)
  if (session.user.role !== 'student') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  
  // 3. Resource ownership check (if needed)
  const resource = await prisma.project.findUnique({
    where: { projectId: parseInt(params.id) }
  });
  
  if (resource.createdById !== parseInt(session.user.id)) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }
  
  // 4. Proceed with operation
}
```

---

## Performance Optimizations

### 1. Dashboard Data Loading

```typescript
// Parallel data fetching
const [student, supervisors, students, stats] = await Promise.all([
  prisma.student.findUnique({ where: { userId }, include: {...} }),
  prisma.fYPSupervisor.findMany({ where: { campusId }, include: {...} }),
  prisma.student.findMany({ where: { campusId, userId: { not: userId } }, take: 50 }),
  prisma.$transaction([
    prisma.fYPSupervisor.count({ where: { campusId } }),
    prisma.student.count({ where: { campusId } }),
    prisma.project.count({ where: { campusId } })
  ])
]);
```

### 2. Optimistic UI Updates

```typescript
// Optimistic invitation acceptance
const handleAccept = async (invitationId: number) => {
  // Immediately update UI
  setInvitations(prev => prev.filter(inv => inv.id !== invitationId));
  
  // Then make API call
  try {
    await fetch('/api/groups/invitations', {
      method: 'PATCH',
      body: JSON.stringify({ invitationId, action: 'accept' })
    });
  } catch (error) {
    // Revert on error
    fetchInvitations();
  }
};
```

### 3. Lazy Loading

```typescript
// Load data only when needed
const [showFeasibilityReport, setShowFeasibilityReport] = useState(false);
const [feasibilityReport, setFeasibilityReport] = useState(null);

const fetchFeasibilityReport = async () => {
  // Check if already loaded or stored in project
  if (project?.feasibilityReport) {
    setFeasibilityReport(project.feasibilityReport);
    setShowFeasibilityReport(true);
    return;
  }
  
  if (feasibilityReport) {
    setShowFeasibilityReport(!showFeasibilityReport);
    return;
  }
  
  // Only fetch if not available
  setLoadingFeasibility(true);
  const response = await fetch(`/api/projects/${projectId}/feasibility`);
  // ...
};
```

### 4. Reduced Re-renders

```typescript
// Memoize expensive computations
const filteredStudents = useMemo(() => {
  return students.filter(student =>
    student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.rollNumber.includes(searchQuery)
  );
}, [students, searchQuery]);
```

---

## UI Components

### StudentSidebar

Consistent navigation across all student pages:

```typescript
const sidebarItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/student/dashboard' },
  { icon: FolderKanban, label: 'Projects', path: '/student/projects' },
  { icon: Users, label: 'My Group', path: '/student/group' },
  { icon: MessageSquare, label: 'Chat', path: '/student/chat' },
  { icon: UserSearch, label: 'Browse Students', path: '/student/browse-students' },
  { icon: GraduationCap, label: 'Browse Supervisors', path: '/student/browse-supervisors' },
  { icon: Mail, label: 'Invitations', path: '/student/invitations' },
  { icon: Bell, label: 'Notifications', path: '/student/notifications' },
  { icon: User, label: 'Profile', path: '/student/profile' },
];
```

### Common UI Patterns

- **Loading States**: Skeleton loaders and spinners
- **Empty States**: Helpful messages with CTAs
- **Error States**: Error messages with retry options
- **Success Feedback**: Toast notifications and modals
- **Responsive Design**: Mobile-first with sidebar drawer
