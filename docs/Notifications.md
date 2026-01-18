# Notification System Documentation

## Table of Contents
1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Notification Flow](#notification-flow)
4. [Database Models](#database-models)
5. [API Routes & Endpoints](#api-routes--endpoints)
6. [Notification Types](#notification-types)
7. [Role-Based Notification Access](#role-based-notification-access)
8. [Frontend Components](#frontend-components)
9. [Special Notification Features](#special-notification-features)
10. [Edge Cases & Validations](#edge-cases--validations)
11. [Performance Optimizations](#performance-optimizations)

---

## Overview

The Notification System provides a comprehensive platform for:

1. **Coordinator Broadcasts**: Send notifications to all users, students, supervisors, or specific users
2. **System Notifications**: Automatic notifications for group events, invitations, approvals
3. **Help Request System**: Students submit issues that coordinators receive
4. **Permission Requests**: Students request access to supervisor projects
5. **Read/Unread Tracking**: Individual read status per user

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         NOTIFICATION SOURCES                                 │
├─────────────────────────┬─────────────────────────┬─────────────────────────┤
│   Coordinator Actions   │   System Events         │   User Requests         │
│   • Broadcast messages  │   • Group created       │   • Help requests       │
│   • Announcements       │   • Invitation accepted │   • Permission requests │
│   • Reminders           │   • Supervisor assigned │                         │
└─────────────────────────┴─────────────────────────┴─────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         API LAYER                                            │
│   POST /api/notifications        - Create notification (coordinator)        │
│   POST /api/help/submit-issue    - Submit help request                      │
│   System: Direct prisma calls    - Auto-generated notifications             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DATABASE LAYER                                       │
│   Notification Model             - Title, message, type, target             │
│   NotificationRecipient Model    - Per-user read status                     │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FRONTEND LAYER                                       │
│   NotificationBell Component     - Header notification indicator            │
│   Notifications Page             - Full notification management             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Notification Flow

### Creating a Notification (Coordinator Broadcast)

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  Coordinator     │     │  API Endpoint    │     │  Database        │
│  fills form      │ --> │  validates &     │ --> │  stores          │
│  & clicks Send   │     │  processes       │     │  notification    │
└──────────────────┘     └──────────────────┘     └──────────────────┘
                                  │
                    ┌─────────────┼─────────────┐
                    │             │             │
                    ▼             ▼             ▼
              ┌─────────┐   ┌─────────┐   ┌─────────┐
              │Recipient│   │Recipient│   │Recipient│
              │ Record  │   │ Record  │   │ Record  │
              │(User 1) │   │(User 2) │   │(User N) │
              └─────────┘   └─────────┘   └─────────┘
```

### Receiving & Reading Notifications

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  User opens      │     │  GET /api/       │     │  Returns         │
│  notifications   │ --> │  notifications   │ --> │  notifications   │
│  page            │     │                  │     │  with isRead     │
└──────────────────┘     └──────────────────┘     └──────────────────┘
         │
         ▼
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  User clicks     │     │  PUT /api/       │     │  Updates         │
│  notification    │ --> │  notifications/  │ --> │  recipient       │
│                  │     │  [id]            │     │  isRead=true     │
└──────────────────┘     └──────────────────┘     └──────────────────┘
```

---

## Database Models

### Notification Model

```prisma
model Notification {
  notificationId Int                @id @default(autoincrement())
  title          String             @db.VarChar(255)
  message        String             @db.Text
  type           NotificationType   @default(general)
  targetType     NotificationTarget
  createdById    Int                @map("created_by_id")
  campusId       Int?               @map("campus_id")
  createdAt      DateTime           @default(now())
  updatedAt      DateTime           @updatedAt

  recipients NotificationRecipient[]

  @@map("notifications")
}
```

### NotificationRecipient Model

```prisma
model NotificationRecipient {
  id             Int       @id @default(autoincrement())
  notificationId Int       @map("notification_id")
  userId         Int       @map("user_id")
  isRead         Boolean   @default(false)
  readAt         DateTime? @map("read_at")
  createdAt      DateTime  @default(now())

  notification Notification @relation(fields: [notificationId], references: [notificationId], onDelete: Cascade)

  @@unique([notificationId, userId])
  @@map("notification_recipients")
}
```

### Enums

```prisma
enum NotificationType {
  general
  urgent
  announcement
  reminder
}

enum NotificationTarget {
  all_users
  all_students
  all_supervisors
  specific_users
}
```

---

## API Routes & Endpoints

### Core Endpoints

| Endpoint | Method | Purpose | Access |
|----------|--------|---------|--------|
| `/api/notifications` | GET | Fetch user's notifications | All users |
| `/api/notifications` | POST | Create notification | Coordinator |
| `/api/notifications` | DELETE | Delete all notifications | All users |
| `/api/notifications/[id]` | PUT | Mark as read | All users |
| `/api/notifications/[id]` | DELETE | Delete notification | All users |
| `/api/notifications/mark-all-read` | PUT | Mark all as read | All users |
| `/api/notifications/sent` | GET | Get sent notifications | Coordinator |
| `/api/notifications/[id]/reply` | POST | Reply to help request | Coordinator |

### Fetching Notifications

```typescript
// GET /api/notifications
export async function GET(request: NextRequest) {
  const session = await auth();
  const userId = parseInt(session.user.id);

  // Get notifications for this user via recipient records
  const notifications = await prisma.notificationRecipient.findMany({
    where: { userId },
    include: { notification: true },
    orderBy: { createdAt: 'desc' }
  });

  // Get unread count
  const unreadCount = await prisma.notificationRecipient.count({
    where: { userId, isRead: false }
  });

  return NextResponse.json({
    notifications: notifications.map((nr) => ({
      id: nr.notification.notificationId,
      title: nr.notification.title,
      message: nr.notification.message,
      type: nr.notification.type,
      isRead: nr.isRead,
      readAt: nr.readAt,
      createdAt: nr.notification.createdAt,
      createdById: nr.notification.createdById
    })),
    unreadCount
  });
}
```

### Creating Notifications (Coordinator)

```typescript
// POST /api/notifications
export async function POST(request: NextRequest) {
  const session = await auth();
  
  // Only coordinators can create notifications
  if (session.user.role !== 'coordinator') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  
  const userId = parseInt(session.user.id);
  const { title, message, type, targetType, specificUserIds } = await request.json();

  // Get coordinator's campus
  const coordinator = await prisma.fYPCoordinator.findUnique({
    where: { userId }
  });
  const campusId = coordinator.campusId;

  // Determine recipients based on target type
  let recipientIds: number[] = [];
  
  switch (targetType) {
    case 'all_users':
      // Get all students and supervisors in campus
      const students = await prisma.student.findMany({
        where: { campusId },
        select: { userId: true }
      });
      const supervisors = await prisma.fYPSupervisor.findMany({
        where: { campusId },
        select: { userId: true }
      });
      recipientIds = [
        ...students.map(s => s.userId),
        ...supervisors.map(s => s.userId)
      ];
      break;
      
    case 'all_students':
      const allStudents = await prisma.student.findMany({
        where: { campusId },
        select: { userId: true }
      });
      recipientIds = allStudents.map(s => s.userId);
      break;
      
    case 'all_supervisors':
      const allSupervisors = await prisma.fYPSupervisor.findMany({
        where: { campusId },
        select: { userId: true }
      });
      recipientIds = allSupervisors.map(s => s.userId);
      break;
      
    case 'specific_users':
      // Validate specific user IDs belong to this campus
      const validUsers = await prisma.user.findMany({
        where: {
          userId: { in: specificUserIds },
          OR: [
            { student: { campusId } },
            { supervisor: { campusId } }
          ]
        }
      });
      recipientIds = validUsers.map(u => u.userId);
      break;
  }

  // Create notification with recipient records
  const notification = await prisma.notification.create({
    data: {
      title,
      message,
      type,
      targetType,
      createdById: userId,
      campusId,
      recipients: {
        create: recipientIds.map(uid => ({ userId: uid }))
      }
    },
    include: { recipients: true }
  });

  return NextResponse.json({
    success: true,
    message: `Notification sent to ${recipientIds.length} user(s)`,
    notification: {
      id: notification.notificationId,
      title: notification.title,
      recipientCount: notification.recipients.length
    }
  });
}
```

### Marking as Read

```typescript
// PUT /api/notifications/[id]
export async function PUT(request: NextRequest, { params }) {
  const session = await auth();
  const userId = parseInt(session.user.id);
  const notificationId = parseInt(params.id);

  // Update recipient record
  const updated = await prisma.notificationRecipient.updateMany({
    where: {
      notificationId,
      userId
    },
    data: {
      isRead: true,
      readAt: new Date()
    }
  });

  if (updated.count === 0) {
    return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
```

### Mark All as Read

```typescript
// PUT /api/notifications/mark-all-read
export async function PUT(request: NextRequest) {
  const session = await auth();
  const userId = parseInt(session.user.id);

  await prisma.notificationRecipient.updateMany({
    where: {
      userId,
      isRead: false
    },
    data: {
      isRead: true,
      readAt: new Date()
    }
  });

  return NextResponse.json({ success: true });
}
```

### Deleting Notifications

```typescript
// DELETE /api/notifications/[id]
export async function DELETE(request: NextRequest, { params }) {
  const session = await auth();
  const userId = parseInt(session.user.id);
  const notificationId = parseInt(params.id);

  // For coordinators - delete entire notification if they created it
  if (session.user.role === 'coordinator') {
    const notification = await prisma.notification.findUnique({
      where: { notificationId }
    });
    
    if (notification && notification.createdById === userId) {
      // Delete notification (cascades to recipients)
      await prisma.notification.delete({
        where: { notificationId }
      });
      return NextResponse.json({ success: true });
    }
  }

  // For all users - remove their recipient record (dismiss from their view)
  await prisma.notificationRecipient.deleteMany({
    where: {
      notificationId,
      userId
    }
  });

  return NextResponse.json({ success: true });
}
```

---

## Notification Types

### Type Definitions

| Type | Purpose | UI Color |
|------|---------|----------|
| `general` | Standard announcements | Cyan/Green |
| `urgent` | Important/time-sensitive | Amber/Yellow |
| `announcement` | Official announcements | Blue |
| `reminder` | Deadlines and reminders | Blue |

### System-Generated Notifications

| Trigger | Notification Created |
|---------|---------------------|
| Group invitation received | "You've been invited to join [Group Name]" |
| Invitation accepted | "[User] has joined your group" |
| Supervisor accepts invitation | "[Supervisor] is now supervising your group" |
| Permission request received | "[Student] is requesting permission for [Project]" |
| Permission granted/denied | "Your permission request was [approved/rejected]" |
| Help request submitted | "Help Request: [Issue Type]" (to coordinator) |

### Example: System Notification for Group Join

```typescript
// When supervisor accepts group invitation
if (action === 'accept') {
  // Get all students in the group
  const groupStudents = await prisma.student.findMany({
    where: { groupId: invitation.groupId },
    select: { userId: true }
  });

  // Create notification for each group member
  await prisma.notification.createMany({
    data: groupStudents.map((student) => ({
      userId: student.userId,
      title: "Supervisor Joined",
      message: `${supervisorName} has accepted your invitation to supervise your group "${groupName}"`,
      type: "GROUP_UPDATE"
    }))
  });
}
```

---

## Role-Based Notification Access

### Student

| Feature | Access |
|---------|--------|
| Receive notifications | ✅ |
| View notifications | ✅ |
| Mark as read | ✅ |
| Delete (dismiss) notifications | ✅ |
| Create notifications | ❌ |
| Submit help requests | ✅ |
| Request project permission | ✅ |

### Supervisor

| Feature | Access |
|---------|--------|
| Receive notifications | ✅ |
| View notifications | ✅ |
| Mark as read | ✅ |
| Delete (dismiss) notifications | ✅ |
| Create notifications | ❌ |
| Respond to permission requests | ✅ |

### Coordinator

| Feature | Access |
|---------|--------|
| Receive notifications | ✅ |
| View notifications | ✅ (Inbox tab) |
| Create notifications | ✅ (Create tab) |
| View sent notifications | ✅ (Sent tab) |
| Reply to help requests | ✅ |
| Delete own notifications | ✅ (also deletes for recipients) |
| Target specific users | ✅ |

---

## Frontend Components

### NotificationBell Component (`components/NotificationBell.tsx`)

A persistent header component that shows unread notification count:

```typescript
function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isPending, startTransition] = useTransition();

  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications');
      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.unreadCount);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  }, []);

  useEffect(() => {
    fetchUnreadCount();
    // Poll every 60 seconds
    const interval = setInterval(fetchUnreadCount, 60000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  const handleClick = useCallback(() => {
    startTransition(() => {
      // Navigate to notifications based on user role
      const notificationPath = pathname.startsWith('/coordinator')
        ? '/coordinator/notifications'
        : pathname.startsWith('/supervisor')
        ? '/supervisor/notifications'
        : '/student/notifications';
      router.push(notificationPath);
    });
  }, [pathname, router]);

  return (
    <button onClick={handleClick} className="relative">
      <Bell className="w-5 h-5" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </button>
  );
}
```

### Notifications Page Structure

#### Student/Supervisor View

```
┌────────────────────────────────────────────────────────────────────┐
│  Header: Notifications                                              │
│  Subtext: "You have X unread notifications" / "All caught up!"     │
├─────────────────────────────────────────────────────────────────────┤
│  Actions: [Mark All Read] [Delete All]                              │
├─────────────────────────────────────────────────────────────────────┤
│  Search: [🔍 Search notifications...]                               │
│  Filter: [All] [Unread] [Read]                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ [Icon] Notification Title                     [Type Badge]  │   │
│  │        Message preview...                                    │   │
│  │        📅 Today • 🕐 2:30 PM • 👤 Sender Name               │   │
│  │                                    [✓ Mark Read] [🗑 Delete]│   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ [Icon] Another Notification...                              │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

#### Coordinator View (With Tabs)

```
┌────────────────────────────────────────────────────────────────────┐
│  Header: Notifications                                              │
├─────────────────────────────────────────────────────────────────────┤
│  Tabs: [📥 Inbox] [✏️ Create] [📤 Sent]                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ═══════════════════ INBOX TAB ═══════════════════                 │
│  • Received notifications                                           │
│  • Help requests with parsed details                                │
│  • Reply functionality for help requests                            │
│                                                                     │
│  ═══════════════════ CREATE TAB ═══════════════════                │
│  Title:     [________________________]                              │
│  Message:   [________________________]                              │
│             [________________________]                              │
│  Type:      [General ▼]                                            │
│  Target:    [All Users ▼]                                          │
│  (If specific users selected: User selection list)                 │
│                        [Send Notification]                          │
│                                                                     │
│  ═══════════════════ SENT TAB ═══════════════════                  │
│  • List of sent notifications                                       │
│  • Read count: 5/10 recipients                                      │
│  • Delete option                                                    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Notification Detail Modal

```typescript
// When user clicks a notification
<AnimatePresence>
  {selectedNotification && (
    <motion.div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50">
      <motion.div className="bg-white rounded-2xl shadow-2xl p-6 max-w-lg mx-auto mt-20">
        {/* Type Badge */}
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getTypeBadgeStyle()}`}>
          {selectedNotification.type}
        </span>
        
        {/* Title */}
        <h2 className="text-xl font-bold mt-4">{selectedNotification.title}</h2>
        
        {/* Message Content */}
        <div className="bg-gray-50 rounded-xl p-4 mt-4">
          <p className="text-gray-700 whitespace-pre-wrap">
            {selectedNotification.message}
          </p>
        </div>
        
        {/* Metadata */}
        <div className="flex items-center gap-4 text-sm text-gray-500 mt-4">
          <span>📅 {formatDate(selectedNotification.createdAt)}</span>
          <span>🕐 {formatTime(selectedNotification.createdAt)}</span>
        </div>
        
        {/* Actions */}
        <div className="flex gap-3 mt-6">
          {!selectedNotification.isRead && (
            <Button onClick={() => markAsRead(selectedNotification.id)}>
              <Check className="w-4 h-4 mr-2" /> Mark as Read
            </Button>
          )}
          <Button variant="outline" onClick={() => deleteNotification(selectedNotification.id)}>
            <Trash2 className="w-4 h-4 mr-2" /> Delete
          </Button>
          <Button variant="outline" onClick={() => setSelectedNotification(null)}>
            Close
          </Button>
        </div>
      </motion.div>
    </motion.div>
  )}
</AnimatePresence>
```

---

## Special Notification Features

### 1. Help Request System

Students can submit issues to coordinators:

```typescript
// POST /api/help/submit-issue
export async function POST(request: Request) {
  const { name, email, rollNumber, issueType, message } = await request.json();

  // Get all coordinators (or coordinators of student's campus)
  const coordinators = await prisma.fYPCoordinator.findMany({
    include: { user: true }
  });

  // Create notification for each coordinator
  for (const coordinator of coordinators) {
    const notificationTitle = `Help Request: ${issueTypeLabels[issueType]}`;
    const notificationMessage = `
**From:** ${name}
**Email:** ${email}
${rollNumber ? `**Roll Number:** ${rollNumber}` : ''}
**Issue Type:** ${issueTypeLabels[issueType]}
**Message:**
${message}
    `.trim();

    await prisma.notification.create({
      data: {
        title: notificationTitle,
        message: notificationMessage,
        type: 'urgent',
        targetType: 'specific_users',
        createdById: 0, // System-generated
        campusId: coordinator.campusId,
        recipients: {
          create: { userId: coordinator.userId }
        }
      }
    });
  }

  return NextResponse.json({ success: true });
}
```

**Coordinator View of Help Request:**
- Parsed fields displayed nicely (From, Email, Roll Number, Issue Type)
- Reply button to send email response

### 2. Permission Request System

Supervisors see permission requests in their notifications:

```typescript
// Detecting permission request in notification
const isPermissionRequest = (notification: Notification) => {
  return notification.title?.toLowerCase().includes('permission request') ||
         notification.message?.toLowerCase().includes('requesting permission');
};

// Parsing permission request details
const parsePermissionRequest = (message: string) => {
  const studentMatch = message.match(/Student:\s*([^(\n]+)/);
  const rollMatch = message.match(/\(([^)]+)\)/);
  const projectMatch = message.match(/project\s+"([^"]+)"/i);
  
  return {
    studentName: studentMatch?.[1]?.trim(),
    rollNumber: rollMatch?.[1],
    projectTitle: projectMatch?.[1]
  };
};
```

### 3. Sent Notifications Tracking

Coordinators can see read statistics for their sent notifications:

```typescript
// GET /api/notifications/sent
export async function GET(request: NextRequest) {
  const userId = parseInt(session.user.id);

  const notifications = await prisma.notification.findMany({
    where: { createdById: userId },
    include: {
      recipients: {
        select: { isRead: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  return NextResponse.json({
    notifications: notifications.map((n) => ({
      id: n.notificationId,
      title: n.title,
      message: n.message,
      type: n.type,
      targetType: n.targetType,
      recipientCount: n.recipients.length,
      readCount: n.recipients.filter(r => r.isRead).length,
      createdAt: n.createdAt
    }))
  });
}
```

---

## Edge Cases & Validations

### Creation Validations

| Validation | Error Response |
|------------|---------------|
| Not authenticated | 401 Unauthorized |
| Not a coordinator | 403 Forbidden |
| Missing title/message | 400 Bad Request |
| Invalid target type | 400 Bad Request |
| No recipients found | 400 "No recipients found" |
| Specific users not in campus | Filtered out silently |

### Read/Delete Validations

| Validation | Handling |
|------------|----------|
| Notification not found | 404 Not Found |
| User not a recipient | No update, return success |
| Coordinator deleting own notification | Delete for all recipients |
| User deleting notification | Only removes their recipient record |

### Polling Edge Cases

| Scenario | Handling |
|----------|----------|
| Network failure during poll | Silent failure, retry on next interval |
| User logs out during poll | Interval cleared on component unmount |
| Page hidden/backgrounded | Polling continues (60s interval is reasonable) |

---

## Performance Optimizations

### 1. Reduced Polling Frequency

```typescript
// Poll every 60 seconds (reduced from 30s)
const interval = setInterval(fetchUnreadCount, 60000);
```

### 2. Transition for Navigation

```typescript
// Use useTransition to prevent UI blocking
const [isPending, startTransition] = useTransition();

const handleClick = useCallback(() => {
  startTransition(() => {
    router.push(notificationPath);
  });
}, [pathname, router]);
```

### 3. Efficient Queries

```typescript
// Only fetch unread count for bell (lightweight)
const unreadCount = await prisma.notificationRecipient.count({
  where: { userId, isRead: false }
});

// Full notifications only on page load
const notifications = await prisma.notificationRecipient.findMany({
  where: { userId },
  include: { notification: true },
  orderBy: { createdAt: 'desc' }
});
```

### 4. Batch Operations

```typescript
// Mark all as read in single query
await prisma.notificationRecipient.updateMany({
  where: { userId, isRead: false },
  data: { isRead: true, readAt: new Date() }
});

// Delete all in single query
await prisma.notificationRecipient.deleteMany({
  where: { userId }
});
```

### 5. Cascading Deletes

```prisma
model NotificationRecipient {
  notification Notification @relation(
    fields: [notificationId], 
    references: [notificationId], 
    onDelete: Cascade  // Auto-delete recipients when notification deleted
  )
}
```

---

## Environment Variables

No additional environment variables required for the notification system. It uses the same database connection as the rest of the application:

```env
DATABASE_URL=postgresql://user:password@host:port/database
```

---

## Future Improvements

1. **Push Notifications**: Implement web push for real-time alerts
2. **Email Notifications**: Send email for important notifications
3. **Notification Preferences**: Allow users to customize notification types
4. **Scheduled Notifications**: Allow coordinators to schedule announcements
5. **Rich Media**: Support images and links in notifications
6. **Notification Templates**: Pre-built templates for common announcements
