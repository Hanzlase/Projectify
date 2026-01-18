# Groups and Chat System Documentation

## Table of Contents
1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Group System](#group-system)
4. [Chat System](#chat-system)
5. [Message Encryption](#message-encryption)
6. [API Routes & Endpoints](#api-routes--endpoints)
7. [Database Models](#database-models)
8. [Real-time Updates](#real-time-updates)
9. [Edge Cases & Validations](#edge-cases--validations)
10. [Performance Optimizations](#performance-optimizations)
11. [Role-Based Flows](#role-based-flows)

---

## Overview

The Groups and Chat system is a comprehensive communication platform that enables:

1. **FYP Group Management**: Students form groups of 3 members + 1 supervisor
2. **Direct Messaging**: One-on-one communication between users
3. **Group Chat**: Team communication within FYP groups
4. **Secure Messaging**: AES-256-CBC encrypted messages
5. **File Sharing**: Attachment support with R2 cloud storage

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND LAYER                                     │
│   • Student Chat Page     (/student/chat)                                   │
│   • Supervisor Chat Page  (/supervisor/chat)                                │
│   • Coordinator Chat Page (/coordinator/chat)                               │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           API LAYER                                          │
│   • /api/chat             - List/Create conversations                       │
│   • /api/chat/[id]        - Get/Send messages                               │
│   • /api/chat/pin         - Pin/Unpin conversations                         │
│   • /api/chat/upload      - File attachments                                │
│   • /api/groups           - Group CRUD operations                           │
│   • /api/groups/invitations - Group invitations                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ENCRYPTION LAYER                                   │
│   • encryptMessage()      - AES-256-CBC encryption                          │
│   • decryptMessage()      - AES-256-CBC decryption                          │
│   • IV per message        - Unique IV for each message                      │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DATABASE LAYER                                     │
│   • Conversation          - Container for messages                          │
│   • ConversationParticipant - User access control                           │
│   • Message               - Encrypted content storage                       │
│   • Group                  - FYP group data                                 │
│   • GroupChat              - Links group to conversation                    │
│   • GroupInvitation        - Pending invites                                │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           STORAGE LAYER                                      │
│   • Cloudflare R2         - File attachment storage                         │
│   • PostgreSQL            - Message and metadata storage                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Group System

### Group Composition

Each FYP group consists of:
- **Maximum 3 Students** (from the same campus)
- **1 Supervisor** (assigned after accepting invitation)
- **1 Project** (attached to the group)

### Group Creation Flow

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  Student selects │ --> │  Student selects │ --> │  Student selects │
│  a project       │     │  team members    │     │  a supervisor    │
└──────────────────┘     └──────────────────┘     └──────────────────┘
         │                        │                        │
         └────────────────────────┼────────────────────────┘
                                  │
                                  ▼
                    ┌──────────────────────────┐
                    │  API: POST /api/groups   │
                    │  • Create Group          │
                    │  • Create GroupChat      │
                    │  • Create Conversation   │
                    │  • Add creator as member │
                    │  • Send invitations      │
                    └──────────────────────────┘
                                  │
                    ┌─────────────┼─────────────┐
                    │             │             │
                    ▼             ▼             ▼
              ┌─────────┐   ┌─────────┐   ┌─────────┐
              │ Student │   │ Student │   │Supervisor│
              │ Invite  │   │ Invite  │   │ Invite   │
              └─────────┘   └─────────┘   └─────────┘
```

### Group API Implementation

```typescript
// POST /api/groups - Create new group
export async function POST(req: NextRequest) {
  const { projectId, studentUserIds, supervisorUserId } = await req.json();
  
  // 1. Validate user is a student
  // 2. Validate student hasn't already created a group
  // 3. Validate project exists and is accessible
  // 4. Create the group
  const group = await prisma.group.create({
    data: {
      groupName: project.title,
      projectId,
      createdById: student.studentId,
    }
  });
  
  // 5. Update creator's student record
  await prisma.student.update({
    where: { studentId: student.studentId },
    data: { groupId: group.groupId, isGroupAdmin: true }
  });
  
  // 6. Create conversation for group chat
  const conversation = await prisma.conversation.create({ data: {} });
  
  // 7. Link group to conversation
  await prisma.groupChat.create({
    data: { groupId: group.groupId, conversationId: conversation.conversationId }
  });
  
  // 8. Add creator as conversation participant
  await prisma.conversationParticipant.create({
    data: { conversationId: conversation.conversationId, userId }
  });
  
  // 9. Send invitations to selected students
  for (const studentUserId of studentUserIds) {
    await prisma.groupInvitation.create({
      data: {
        groupId: group.groupId,
        inviterId: userId,
        inviteeId: studentUserId,
        inviteeRole: 'student',
        status: 'pending'
      }
    });
  }
  
  // 10. Send invitation to supervisor
  if (supervisorUserId) {
    await prisma.groupInvitation.create({
      data: {
        groupId: group.groupId,
        inviterId: userId,
        inviteeId: supervisorUserId,
        inviteeRole: 'supervisor',
        status: 'pending'
      }
    });
  }
  
  return { group, message: 'Group created! Invitations sent.' };
}
```

### Group Invitation Acceptance Flow

#### Student Accepts Invitation

```typescript
// PATCH /api/groups/invitations
// When student accepts:
// 1. Add student to group
await prisma.student.update({
  where: { studentId: student.studentId },
  data: { groupId: group.groupId }
});

// 2. Add to group chat conversation
await prisma.conversationParticipant.create({
  data: { conversationId, userId }
});

// 3. Send join message
await prisma.message.create({
  data: {
    conversationId,
    senderId: userId,
    content: `👋 ${userName} has joined the group!`
  }
});

// 4. Update invitation status
await prisma.groupInvitation.update({
  where: { id: invitationId },
  data: { status: 'accepted' }
});

// 5. Create notifications for other members
```

#### Supervisor Accepts Invitation

```typescript
// PATCH /api/supervisor/invitations/[id]
// When supervisor accepts:
// 1. Assign supervisor to group
await prisma.group.update({
  where: { groupId: invitation.groupId },
  data: { supervisorId: userId }
});

// 2. Add supervisor to group chat
const groupChat = await prisma.groupChat.findFirst({
  where: { groupId: invitation.groupId }
});

if (groupChat) {
  // Check if already a participant (avoid duplicate)
  const existingParticipant = await prisma.conversationParticipant.findUnique({
    where: {
      conversationId_userId: {
        conversationId: groupChat.conversationId,
        userId
      }
    }
  });

  if (!existingParticipant) {
    await prisma.conversationParticipant.create({
      data: { conversationId: groupChat.conversationId, userId }
    });

    // Send join message
    await prisma.message.create({
      data: {
        conversationId: groupChat.conversationId,
        senderId: userId,
        content: `🎓 ${supervisorName} (Supervisor) has joined the group!`
      }
    });
  }
}

// 3. Update invitation status
await prisma.groupInvitation.update({
  where: { id: invitationId },
  data: { status: 'accepted' }
});

// 4. Notify group members
```

---

## Chat System

### Conversation Types

1. **Direct Conversations**: 2 participants (one-on-one)
2. **Group Conversations**: Multiple participants (linked via GroupChat)

### Starting a Conversation

```typescript
// POST /api/chat
export async function POST(request: Request) {
  const { recipientId } = await request.json();
  const userId = parseInt(session.user.id);
  
  // Check if conversation already exists
  const existingConversations = await prisma.conversation.findMany({
    where: {
      AND: [
        { participants: { some: { userId } } },
        { participants: { some: { userId: recipientId } } }
      ]
    },
    include: {
      participants: true,
      _count: { select: { participants: true } }
    }
  });
  
  // Find direct conversation (exactly 2 participants)
  const existingConversation = existingConversations.find(
    c => c._count.participants === 2
  );
  
  if (existingConversation) {
    return { conversationId: existingConversation.conversationId, isNew: false };
  }
  
  // Create new conversation
  const newConversation = await prisma.conversation.create({
    data: {
      participants: {
        create: [
          { userId },
          { userId: recipientId }
        ]
      }
    }
  });
  
  return { conversationId: newConversation.conversationId, isNew: true };
}
```

### Fetching Conversations

```typescript
// GET /api/chat
export async function GET(request: NextRequest) {
  const userId = parseInt(session.user.id);
  
  // 1. Get direct conversations
  const conversations = await prisma.conversation.findMany({
    where: { participants: { some: { userId } } },
    include: {
      participants: { include: { user: { select: {...} } } },
      messages: { orderBy: { createdAt: 'desc' }, take: 1 }
    },
    orderBy: { updatedAt: 'desc' }
  });
  
  // 2. Filter to direct conversations (exactly 2 participants)
  const directConversations = conversations.filter(c => 
    c.participants.length === 2
  );
  
  // 3. Get group conversations
  const groupChats = await prisma.groupChat.findMany({
    include: { group: { include: { students: {...} } } }
  });
  
  // 4. Filter to groups where user is a member or supervisor
  const userGroupConversations = groupChats.filter(gc => {
    const memberUserIds = gc.group.students.map(s => s.user.userId);
    return memberUserIds.includes(userId) || gc.group.supervisorId === userId;
  });
  
  // 5. Get pinned conversation IDs
  const pinnedConversations = await prisma.pinnedConversation.findMany({
    where: { userId },
    select: { conversationId: true }
  });
  
  return { 
    conversations: directConversations, 
    groupConversations: userGroupConversations,
    pinnedIds: pinnedConversations.map(p => p.conversationId)
  };
}
```

### Message Flow

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   User      │    │   Frontend  │    │   API       │    │   Database  │
│   Types     │ -> │   Sends     │ -> │   Encrypts  │ -> │   Stores    │
│   Message   │    │   Message   │    │   Message   │    │   Encrypted │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
                                              │
┌─────────────┐    ┌─────────────┐    ┌───────┴───────┐
│   User      │    │   Frontend  │    │   API         │
│   Reads     │ <- │   Displays  │ <- │   Decrypts    │
│   Message   │    │   Message   │    │   Message     │
└─────────────┘    └─────────────┘    └───────────────┘
```

---

## Message Encryption

### Encryption Implementation (`lib/encryption.ts`)

```typescript
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.MESSAGE_ENCRYPTION_KEY || 'projectify-secure-key-32chars!!';
const IV_LENGTH = 16;
const ALGORITHM = 'aes-256-cbc';

/**
 * Encrypt a message using AES-256-CBC
 */
export function encryptMessage(text: string): string {
  if (!text) return text;
  
  try {
    // Generate random IV for each encryption
    const iv = crypto.randomBytes(IV_LENGTH);
    
    // Create cipher with key and IV
    const cipher = crypto.createCipheriv(
      ALGORITHM,
      Buffer.from(ENCRYPTION_KEY.padEnd(32).slice(0, 32)),
      iv
    );
    
    // Encrypt the text
    let encrypted = cipher.update(text, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    // Format: IV:EncryptedContent (base64)
    return iv.toString('base64') + ':' + encrypted;
  } catch (error) {
    console.error('Encryption error:', error);
    return text; // Return original on failure
  }
}

/**
 * Decrypt a message
 */
export function decryptMessage(encryptedText: string): string {
  if (!encryptedText) return encryptedText;
  
  try {
    // Check for encrypted format (contains :)
    if (!encryptedText.includes(':')) {
      return encryptedText; // Legacy unencrypted message
    }
    
    const parts = encryptedText.split(':');
    if (parts.length !== 2) return encryptedText;
    
    const iv = Buffer.from(parts[0], 'base64');
    const encrypted = parts[1];
    
    // Validate IV length
    if (iv.length !== IV_LENGTH) return encryptedText;
    
    // Create decipher
    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      Buffer.from(ENCRYPTION_KEY.padEnd(32).slice(0, 32)),
      iv
    );
    
    // Decrypt
    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    return encryptedText; // Return as-is on failure
  }
}
```

### Storage Format

Messages are stored in the database as:
```
<base64_iv>:<base64_encrypted_content>
```

Example:
```
4ZHrWB3mK9pQ1Rxy7LnOvQ==:SGVsbG8gV29ybGQh...
```

### Security Features

| Feature | Implementation |
|---------|---------------|
| Algorithm | AES-256-CBC |
| Key Size | 256 bits (32 bytes) |
| IV | Random 16 bytes per message |
| Encoding | Base64 |
| Legacy Support | Unencrypted messages returned as-is |

---

## API Routes & Endpoints

### Chat Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/chat` | GET | List all conversations (direct + group) |
| `/api/chat` | POST | Create/find conversation with recipient |
| `/api/chat/[conversationId]` | GET | Get messages for a conversation |
| `/api/chat/[conversationId]` | POST | Send a message |
| `/api/chat/[conversationId]/message/[messageId]` | DELETE | Delete a message |
| `/api/chat/pin` | POST | Pin a conversation |
| `/api/chat/pin` | DELETE | Unpin a conversation |
| `/api/chat/upload` | POST | Upload file attachment |

### Group Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/groups` | GET | Get user's groups |
| `/api/groups` | POST | Create new group |
| `/api/groups` | DELETE | Delete group |
| `/api/groups` | PATCH | Update group (admin management) |
| `/api/groups/[groupId]` | GET | Get group details |
| `/api/groups/[groupId]/image` | POST | Upload group image |
| `/api/groups/invitations` | GET | Get group invitations |
| `/api/groups/invitations` | PATCH | Accept/reject invitation |
| `/api/groups/invitations` | DELETE | Cancel sent invitation |

### Message Sending Implementation

```typescript
// POST /api/chat/[conversationId]
export async function POST(request: NextRequest, { params }) {
  const conversationId = parseInt(params.conversationId);
  const userId = parseInt(session.user.id);
  const { content, attachmentUrl, attachmentType, attachmentName } = await request.json();
  
  // Validate content or attachment exists
  if ((!content || content.trim() === '') && !attachmentUrl) {
    return { error: 'Message content or attachment is required' };
  }
  
  // Check if user is participant
  let participant = await prisma.conversationParticipant.findUnique({
    where: {
      conversationId_userId: { conversationId, userId }
    }
  });
  
  // Fallback: Check if user is supervisor of this group chat
  if (!participant) {
    const groupChat = await prisma.groupChat.findUnique({
      where: { conversationId },
      include: { group: true }
    });
    
    if (groupChat && groupChat.group.supervisorId === userId) {
      // Auto-add supervisor as participant
      participant = await prisma.conversationParticipant.create({
        data: { conversationId, userId }
      });
    }
  }
  
  if (!participant) {
    return { error: 'Access denied' };
  }
  
  // Encrypt message content
  const encryptedContent = content ? encryptMessage(content.trim()) : '';
  
  // Create message
  const message = await prisma.message.create({
    data: {
      conversationId,
      senderId: userId,
      content: encryptedContent,
      attachmentUrl: attachmentUrl || null,
      attachmentType: attachmentType || null,
      attachmentName: attachmentName || null,
    }
  });
  
  // Update conversation timestamp
  await prisma.conversation.update({
    where: { conversationId },
    data: { updatedAt: new Date() }
  });
  
  // Return with decrypted content for UI
  return {
    ...message,
    content: decryptMessage(message.content),
    sender: { userId, name: session.user.name, profileImage: null },
    isOwn: true
  };
}
```

---

## Database Models

### Conversation Model

```prisma
model Conversation {
  conversationId Int      @id @default(autoincrement())
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  participants ConversationParticipant[]
  messages     Message[]

  @@map("conversations")
}
```

### ConversationParticipant Model

```prisma
model ConversationParticipant {
  id             Int      @id @default(autoincrement())
  conversationId Int      @map("conversation_id")
  userId         Int      @map("user_id")
  joinedAt       DateTime @default(now())

  @@unique([conversationId, userId])
  @@map("conversation_participants")
}
```

### Message Model

```prisma
model Message {
  messageId      Int      @id @default(autoincrement())
  conversationId Int      @map("conversation_id")
  senderId       Int      @map("sender_id")
  content        String   @db.Text    // Encrypted content
  attachmentUrl  String?  @db.VarChar(500)
  attachmentType String?  @db.VarChar(50)  // image, file
  attachmentName String?  @db.VarChar(255)
  isRead         Boolean  @default(false)
  createdAt      DateTime @default(now())

  conversation Conversation @relation(fields: [conversationId], references: [conversationId])

  @@map("messages")
}
```

### Group Models

```prisma
model Group {
  groupId      Int      @id @default(autoincrement())
  groupName    String?  @db.VarChar(255)
  groupImage   String?  @db.Text
  projectId    Int?     @unique
  createdById  Int      // Student who created the group
  supervisorId Int?     // Assigned supervisor (null until accepted)
  isFull       Boolean  @default(false)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  students         Student[]
  groupChats       GroupChat[]
  groupInvitations GroupInvitation[]

  @@map("groups")
}

model GroupChat {
  id             Int      @id @default(autoincrement())
  groupId        Int
  conversationId Int      @unique  // Links to Conversation
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  group Group @relation(fields: [groupId], references: [groupId])

  @@map("group_chats")
}

model GroupInvitation {
  id          Int                   @id @default(autoincrement())
  groupId     Int
  inviterId   Int                   // User who sent invite
  inviteeId   Int                   // User being invited
  inviteeRole String                // 'student' or 'supervisor'
  status      GroupInvitationStatus @default(pending)
  message     String?               @db.Text
  createdAt   DateTime              @default(now())
  updatedAt   DateTime              @updatedAt

  group Group @relation(fields: [groupId], references: [groupId])

  @@unique([groupId, inviteeId])
  @@map("group_invitations")
}

model PinnedConversation {
  id             Int      @id @default(autoincrement())
  userId         Int
  conversationId Int
  pinnedAt       DateTime @default(now())

  @@unique([userId, conversationId])
  @@map("pinned_conversations")
}
```

---

## Real-time Updates

### Polling Strategy

The chat system uses polling for "real-time" updates:

```typescript
// Frontend: Poll every 3 seconds when conversation is selected
useEffect(() => {
  if (selectedConversation) {
    const interval = setInterval(() => {
      fetchMessages(selectedConversation, true); // silent = true
    }, 3000);
    return () => clearInterval(interval);
  }
}, [selectedConversation]);
```

### Optimistic Updates

Messages appear instantly in the UI before server confirmation:

```typescript
// Create optimistic message
const optimisticMessage = {
  messageId: tempId,
  conversationId: selectedConversation,
  senderId: parseInt(session?.user?.id || '0'),
  content: messageContent,
  createdAt: new Date().toISOString(),
  sender: { userId, name: session?.user?.name },
  isOwn: true,
};

// Add to UI immediately
setMessages(prev => [...prev, optimisticMessage]);

// Send to server
const response = await fetch(`/api/chat/${conversationId}`, {
  method: 'POST',
  body: JSON.stringify({ content: messageContent })
});

if (response.ok) {
  const message = await response.json();
  // Replace optimistic with real message
  setMessages(prev => prev.map(msg =>
    msg.messageId === tempId ? message : msg
  ));
} else {
  // Remove optimistic message on error
  setMessages(prev => prev.filter(msg => msg.messageId !== tempId));
  setNewMessage(messageContent); // Restore input
}
```

### Unread Count Tracking

```typescript
// Count unread messages when fetching conversations
const unreadCount = await prisma.message.count({
  where: {
    conversationId: conv.conversationId,
    senderId: { not: userId },
    isRead: false
  }
});

// Mark as read when opening conversation
await prisma.message.updateMany({
  where: {
    conversationId,
    senderId: { not: userId },
    isRead: false
  },
  data: { isRead: true }
});
```

---

## Edge Cases & Validations

### Group Creation

| Edge Case | Validation |
|-----------|------------|
| Student already in a group | Reject with error message |
| Student has already created a group | Reject with error message |
| Project already assigned to another group | Reject with error message |
| Invited student already in a group | Check before accepting |
| Supervisor at max group capacity | Check `maxGroups` vs `totalGroups` |

### Chat Access

| Edge Case | Handling |
|-----------|----------|
| User not in conversation | Check `ConversationParticipant` |
| Supervisor accessing group chat | Auto-add as participant if group supervisor |
| Deleted conversation | Return 404 |
| Invalid conversation ID | Validate and return error |

### Message Handling

| Edge Case | Handling |
|-----------|----------|
| Empty message without attachment | Reject |
| Legacy unencrypted message | Return as-is |
| Corrupted encrypted message | Return encrypted text |
| File too large (>10MB) | Reject on frontend |

---

## Performance Optimizations

### 1. Efficient Conversation Loading

```typescript
// Get last message only (not all messages)
const conversations = await prisma.conversation.findMany({
  include: {
    messages: {
      orderBy: { createdAt: 'desc' },
      take: 1  // Only get latest message
    }
  }
});
```

### 2. Batch Sender Lookup

```typescript
// Get all messages
const messages = await prisma.message.findMany({...});

// Get unique sender IDs
const senderIds = Array.from(new Set(messages.map(m => m.senderId)));

// Single query for all senders
const senders = await prisma.user.findMany({
  where: { userId: { in: senderIds } }
});

// Map senders to messages
const senderMap = new Map(senders.map(s => [s.userId, s]));
```

### 3. Deduplication

```typescript
// Remove duplicate conversations (same users)
const seenUsers = new Set<number>();
const uniqueConversations = conversationsWithDetails.filter((conv: any) => {
  if (!conv || seenUsers.has(conv.otherUser.userId)) {
    return false;
  }
  seenUsers.add(conv.otherUser.userId);
  return true;
});
```

### 4. Lazy Loading

- Conversations loaded on page mount
- Messages loaded only when conversation selected
- Profile images loaded asynchronously

---

## Role-Based Flows

### Student

| Action | Capability |
|--------|------------|
| Create group | ✅ If not already in a group |
| Send group invitations | ✅ If group admin |
| Accept group invitation | ✅ If not in a group |
| Chat with students | ✅ |
| Chat with supervisors | ✅ |
| Access group chat | ✅ If group member |

### Supervisor

| Action | Capability |
|--------|------------|
| Create group | ❌ |
| Accept group invitation | ✅ If under max groups |
| Chat with students | ✅ Students in their groups |
| Chat with coordinators | ✅ |
| Access group chat | ✅ If assigned supervisor |

### Coordinator

| Action | Capability |
|--------|------------|
| Create group | ❌ |
| Chat with supervisors | ✅ Supervisors in their campus |
| Access group chats | ❌ |
| View group status | ✅ Dashboard overview |

---

## UI Components

### Chat Page Structure

```
┌────────────────────────────────────────────────────────────────────┐
│  Header: User Profile, Theme Toggle, Notification Bell             │
├─────────────────────┬──────────────────────────────────────────────┤
│                     │                                               │
│  Conversation List  │              Message Area                     │
│  ┌───────────────┐  │  ┌─────────────────────────────────────────┐ │
│  │ Search        │  │  │ Chat Header (User/Group Info)           │ │
│  ├───────────────┤  │  ├─────────────────────────────────────────┤ │
│  │ Filter Tabs   │  │  │                                         │ │
│  │ (All/Groups)  │  │  │           Messages                      │ │
│  ├───────────────┤  │  │                                         │ │
│  │ Pinned        │  │  │    [Sender Avatar] Message Bubble       │ │
│  │ Conversations │  │  │                                         │ │
│  ├───────────────┤  │  │           Message Bubble [Your Avatar]  │ │
│  │               │  │  │                                         │ │
│  │ Conversation  │  │  ├─────────────────────────────────────────┤ │
│  │ Items         │  │  │ Message Input                           │ │
│  │               │  │  │ [Emoji] [Attach] [Input Field] [Send]   │ │
│  └───────────────┘  │  └─────────────────────────────────────────┘ │
│                     │                                               │
└─────────────────────┴──────────────────────────────────────────────┘
```

### Key UI States

- **Loading**: Skeleton loaders for conversations and messages
- **Empty**: "No conversations yet" with call-to-action
- **Selected**: Highlighted conversation in list
- **Unread**: Badge with unread count
- **Pinned**: Pin icon and priority sorting
- **Sending**: Optimistic message with pending state
- **Error**: Error message with retry option

---

## Environment Variables

```env
# Message Encryption
MESSAGE_ENCRYPTION_KEY=your-32-character-secret-key

# Cloudflare R2 (for attachments)
CLOUDFLARE_R2_ACCESS_KEY_ID=your_access_key
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your_secret_key
CLOUDFLARE_R2_BUCKET_NAME=projectify
CLOUDFLARE_R2_ENDPOINT=https://xxx.r2.cloudflarestorage.com
CLOUDFLARE_R2_PUBLIC_URL=https://your-public-url.com
```
