# System Architecture: Projectify

## 1. Overview

**Projectify** is a comprehensive **Final Year Project (FYP) Management Platform** designed to streamline the entire lifecycle of academic final year projects at a multi-campus university environment.

### Purpose and Goals

* **Centralized Project Management**: Enable students to propose, develop, and manage FYP projects collaboratively
* **Supervisor-Student Collaboration**: Facilitate seamless communication and mentorship between supervisors and student groups
* **Academic Coordination**: Provide administrators and coordinators with tools to oversee projects, conduct evaluations, and manage resources
* **Project Uniqueness & Feasibility**: Leverage AI/RAG pipelines to detect duplicate projects and assess feasibility before approval
* **Integrated Evaluation System**: Support multi-stage evaluation through designated evaluation panels with scoring and feedback mechanisms
* **Resource Management**: Allow groups to request and track hardware/software resources
* **Real-time Collaboration**: Enable instant messaging, notifications, and meeting scheduling

### Type of Application

**Full-Stack Web Application (Monolithic Architecture)**

* **Frontend**: Modern React-based UI (Next.js 14 with TypeScript)
* **Backend**: Node.js-based API and real-time services
* **Database**: PostgreSQL (relational)
* **Real-time Communication**: WebSocket-based (Socket.IO with Redis adapter)
* **AI/ML Integration**: Cohere LLM, Pinecone Vector DB, RAG Pipeline
* **File Storage**: Cloudflare R2 (S3-compatible object storage)

---

## 2. Actors / Users

### 2.1 **Students**

* **Responsibilities**:
  - Create and propose FYP projects with full documentation
  - Form groups (up to 3 students) with peer invitations
  - Browse and request supervisor assignments
  - Submit evaluations, assignments, and project documents
  - Collaborate via group chat and task management
  - Request resources (hardware/software) for project execution
  - Receive feedback and grades from supervisors and evaluation panels
  - View similar projects and feasibility recommendations before submission

* **Key Activities**:
  - Manage group membership and roles (group admin status)
  - Participate in meetings scheduled by supervisors or group members
  - Track project status and evaluation scores
  - View notifications and invitations from supervisors/coordinators

### 2.2 **Supervisors**

* **Responsibilities**:
  - Browse and accept student group supervision requests
  - Upload project ideas/templates for students to request
  - Provide ongoing mentorship and guidance via chat/meetings
  - Review and score student evaluations and project submissions
  - Schedule meetings and send reminders to groups
  - Participate in evaluation panels for final project assessment
  - Review resource requests and provide recommendations
  - Manage group capacity (up to 7 groups per supervisor, configurable)

* **Key Activities**:
  - Create and manage group assignments
  - Rate/score group performance and provide feedback
  - Upload domain expertise and specialization information
  - Attend scheduled panel meetings and discussions

### 2.3 **Coordinators (FYP Program Coordinators)**

* **Responsibilities**:
  - Oversee FYP program administration at their campus
  - Create and manage evaluation announcements/assignments
  - Schedule evaluation panels with supervisors
  - Assign groups to evaluation panels
  - Review and approve resource requests from groups
  - Manage supervisor and student accounts
  - Create announcements and notifications campuswide
  - Monitor project statuses and evaluation progress
  - Generate reports and analytics

* **Key Activities**:
  - Manage campus-level settings and constraints
  - Create/grade evaluations with attachments
  - Schedule meetings with groups regarding resource requests
  - Configure industrial projects available for groups

### 2.4 **Administrators**

* **Responsibilities**:
  - System-wide account and permission management
  - Manage multiple campuses and their configurations
  - Oversee all users, roles, and statuses across the system
  - Perform system maintenance and configuration
  - Handle escalated issues and user account modifications

* **Key Activities**:
  - Create/suspend/remove user accounts
  - Manage campus setup and infrastructure
  - Access system health and monitoring dashboards

### 2.5 **External Systems**

* **Cohere AI**: LLM service for project similarity detection and feasibility analysis
* **Pinecone**: Vector database for semantic similarity searching
* **Cloudflare R2**: Object storage for file uploads (documents, images, submissions)
* **Brevo (Email Service)**: Transactional email delivery for notifications and password resets
* **Redis**: Real-time session and cache management for Socket.IO scalability

---

## 3. High-Level Components

### 3.1 Frontend Layer

#### **Technologies**

* **Framework**: Next.js 14.2+ (App Router)
* **UI Library**: React 18.3
* **Styling**: Tailwind CSS 3.4
* **Component Library**: Radix UI, shadcn/ui components
* **State Management**: React hooks, Next-Auth sessions
* **Real-time**: Socket.IO client
* **Data Fetching**: Next.js API routes, fetch API
* **Animations**: Framer Motion, Recharts (for dashboards)
* **3D Graphics**: Three.js (for enhanced visual elements)
* **Language**: TypeScript 5.4+

#### **Responsibilities**

* **Authentication & Authorization**: Credential-based login with role-based access control
* **Multi-Role UI**: Separate dashboards and interfaces for students, supervisors, coordinators, admins
* **Project Management**: Upload, view, edit, and manage FYP projects
* **Group Collaboration**: Invite members, assign roles, manage group settings
* **Real-time Chat**: Send/receive messages with typing indicators, attachments, file sharing
* **Notifications**: Bell icon with unread count, real-time notification streaming
* **Evaluations**: Submit assignments, view grades, upload documents
* **Resource Requests**: Request hardware/software resources with tracking
* **Meeting Scheduling**: View and join scheduled meetings
* **Document Upload & Parsing**: Upload PDFs/DOCX for project proposals with text extraction
* **Responsive Design**: Works on desktop, tablet, and mobile devices

#### **Key Features Handled**

* **Landing/Authentication Pages**: Login, forgot password, reset password flows
* **Role-Based Dashboards**: Customized views for each user role
* **Project Pages**: Create, view, edit, delete, share projects
* **Group Management**: Form groups, invite supervisors, manage members
* **Supervisor Browse**: View available supervisors, filter by campus/expertise
* **Student Browse**: Search for peers to form groups, view peer profiles
* **Chat Interface**: One-on-one and group messaging with persistence
* **Notifications Hub**: Centralized notification management
* **Profile Management**: Edit personal info, upload profile pictures, update skills/interests
* **Evaluation Pages**: Submit work, view feedback, track scores
* **Admin/Coordinator Panels**: User management, campus management, report generation
* **Error Handling & Loading States**: Graceful degradation and user feedback

#### **Performance Optimizations**

* **Image Optimization**: Next.js image optimization with Cloudflare R2
* **Code Splitting**: Automatic route-based splitting with lazy loading
* **Package Optimization**: Configured tree-shaking for large packages (Lucide, Three.js, Recharts)
* **Caching Strategy**: 24-hour browser cache for images (TTL: 86400s)
* **Dark Mode Support**: Stored theme preference with system fallback
* **SWC Minification**: Fast JS/TS compilation via SWC

---

### 3.2 Backend Layer

#### **Technologies**

* **Runtime**: Node.js (v18+) with TypeScript
* **Web Framework**: Next.js 14 API Routes (serverless-ready)
* **Authentication**: NextAuth v5.0 (credentials provider, JWT sessions)
* **ORM**: Prisma 5.14 (PostgreSQL client)
* **Real-time Communication**: Socket.IO 4.8 with Redis adapter
* **Email Service**: Brevo (transactional email API)
* **File Storage**: Cloudflare R2 API
* **AI/ML**: Cohere API (LLM), Pinecone API (vector DB)
* **Document Processing**: pdf-parse, mammoth (document extraction)
* **Password Hashing**: bcryptjs
* **Data Validation**: TypeScript type system

#### **Core Responsibilities**

1. **API Endpoints**: RESTful endpoints for all user operations
2. **Business Logic**: Implement FYP workflow, evaluation rules, permission checks
3. **Data Persistence**: Manage all database operations via Prisma ORM
4. **Authentication & Authorization**: Credential validation, session management, role-based access control
5. **Real-time Services**: WebSocket event handling, room management, online status tracking
6. **Document Processing**: Extract text from PDFs/DOCX, generate embeddings
7. **AI Integration**: Call Cohere for project analysis, similarity detection, feasibility scoring
8. **Vector Search**: Query Pinecone for similar projects
9. **File Management**: Upload to R2, generate URLs, handle file validation
10. **Email Notifications**: Send transactional emails via Brevo
11. **Task Scheduling**: Background job runner for meeting reminders (cron-based)
12. **Error Handling**: Centralized error responses, validation, logging

#### **API Structure (REST)**

All API routes follow the Next.js App Router convention at `/app/api/`:

**Authentication & Users**:
```
POST   /api/auth/[...nextauth]          # NextAuth credential login/logout
POST   /api/auth/reset-password         # Send password reset email
POST   /api/auth/verify-reset-token     # Validate reset token
PATCH  /api/auth/update-password        # Update password with token
```

**Students**:
```
GET    /api/student/profile             # Fetch student profile
PATCH  /api/student/profile             # Update student profile
GET    /api/student/browse-peers        # Search students for group formation
GET    /api/student/browse-supervisors  # List available supervisors
GET    /api/student/invitations         # Fetch pending invitations
POST   /api/student/invitations         # Send group invitation
PATCH  /api/student/invitations/:id     # Accept/reject invitation
```

**Supervisors**:
```
GET    /api/supervisor/profile          # Fetch supervisor profile
PATCH  /api/supervisor/profile          # Update profile, expertise, domains
GET    /api/supervisor/requests         # Groups requesting supervision
PATCH  /api/supervisor/requests/:id     # Accept/reject group request
GET    /api/supervisor/groups           # List supervised groups
POST   /api/supervisor/meetings         # Schedule meeting
```

**Groups**:
```
POST   /api/groups/create               # Create new group
GET    /api/groups/:id                  # Fetch group details
PATCH  /api/groups/:id                  # Update group info
DELETE /api/groups/:id                  # Delete group
GET    /api/groups/:id/invitations      # Group supervisor invitations
POST   /api/groups/:id/invite-supervisor # Invite supervisor
```

**Projects**:
```
POST   /api/projects/create             # Create project with document upload
GET    /api/projects/:id                # Fetch project details
PATCH  /api/projects/:id                # Update project
DELETE /api/projects/:id                # Delete project
POST   /api/projects/:id/check-similarity # Trigger similarity check
POST   /api/projects/:id/publish        # Publish project (visibility toggle)
GET    /api/projects/search             # Search projects by campus/visibility
```

**Evaluations**:
```
POST   /api/evaluations/create          # Create evaluation (coordinator)
GET    /api/evaluations                 # List campus evaluations
POST   /api/evaluations/:id/submit      # Submit evaluation response
PATCH  /api/evaluations/:id/grade       # Grade submission
```

**Evaluation Panels**:
```
POST   /api/evaluation-panels/create    # Create panel (coordinator)
PATCH  /api/evaluation-panels/:id       # Update panel members/config
POST   /api/evaluation-panels/:id/assign # Assign groups to panel
GET    /api/evaluation-panels/:id/groups # List assigned groups
PATCH  /api/evaluation-panels/:id/score # Score group performance
```

**Resource Requests**:
```
POST   /api/resource-requests/create    # Request resources
GET    /api/resource-requests/:id       # Fetch request details
PATCH  /api/resource-requests/:id/review # Supervisor review
PATCH  /api/resource-requests/:id/meeting # Schedule coordinator meeting
```

**Chat & Messaging**:
```
GET    /api/chat/conversations          # List user's conversations
POST   /api/chat/conversations          # Create new conversation
GET    /api/chat/conversations/:id/messages # Fetch conversation history
POST   /api/chat/conversations/:id/messages # Send message (via Socket.IO)
```

**Notifications**:
```
GET    /api/notifications               # Fetch user notifications
PATCH  /api/notifications/:id/read      # Mark notification as read
PATCH  /api/notifications/read-all      # Mark all as read
```

**Industrial Projects** (Supervisor-Uploaded):
```
GET    /api/industrial-projects         # List available projects
POST   /api/industrial-projects/create  # Create new project
PATCH  /api/industrial-projects/:id     # Update project
POST   /api/industrial-projects/:id/request # Request assignment
```

**Page Data**:
```
GET    /api/page-data/:role/:page       # Fetch pre-rendered page data (next.js optimization)
```

**Admin/Coordinator**:
```
GET    /api/admin/users                 # List all users
PATCH  /api/admin/users/:id/status      # Suspend/remove user
POST   /api/coordinator/campuses        # Manage campus settings
```

#### **Key Modules/Services**

**Authentication (`lib/auth.ts`)**:
* Credential-based user authentication via NextAuth v5
* Optimized single query for email/roll number lookup
* Suspended/removed user status handling
* JWT session tokens with encryption
* User role and campus ID extraction from session

**Document Processing (`lib/document-parser.ts`)**:
* PDF text extraction via pdf-parse
* DOCX extraction via mammoth
* Text cleaning and normalization
* Character encoding validation

**AI/RAG Pipeline (`lib/cohere.ts`)**:
* **Project Information Extraction**: Title, abstract, features, tech stack from raw text
* **Feasibility Analysis**: Multi-criteria assessment (timeline, skills, resource needs)
* **Structured JSON Output**: Command-R7B model for deterministic JSON responses
* **Request Queue**: Rate-limited concurrent requests (max 5 simultaneous)
* **Timeout Management**: 60-second timeout with graceful degradation
* **Error Recovery**: Automatic retries with exponential backoff

**Vector Search (`lib/pinecone.ts`)**:
* Semantic similarity search using Cohere embeddings
* Upsert embeddings to Pinecone index (project-embeddings namespace)
* Retrieve top-K similar projects (default K=3)
* Cosine similarity scoring
* Namespace isolation for projects
* Batch operations for bulk upsert

**File Storage (`lib/r2.ts`)**:
* Upload to Cloudflare R2 bucket via HTTP API
* Generate signed/public URLs for file access
* Support for images, PDFs, documents (DOCX, XLSX)
* Content-type detection and validation
* Error handling for upload failures

**Email Service (`lib/email.ts`)**:
* Password reset email templates (HTML + plain text)
* Meeting reminder emails
* Notification digest emails (optional)
* Brevo API integration with retry logic
* Email validation

**Socket.IO Services (`lib/socket.ts`, `lib/socket-emitters.ts`)**:
* **Chat Events**: Send, delete, typing indicators, read status
* **Notification Events**: Real-time unread counts, new notifications
* **Room Management**: Join/leave conversation rooms
* **User Presence**: Online/offline status broadcasting
* **Permission Events**: Real-time updates on access requests
* **Type-safe Event Definitions**: TypeScript interfaces for all events

**Meeting Scheduler (`lib/meeting-scheduler.ts`, `lib/meeting-scheduler-runner.js`)**:
* Scheduled background job runner using node-cron
* Trigger email reminders 24h before and 1h before meetings
* Database query for pending reminders
* Update reminder sent status with timestamps

**Authentication Middleware (`middleware.ts`)**:
* Session validation for protected routes
* Graceful handling of JWT decryption failures
* Auto cookie cleanup on auth errors
* Skip auth for public routes and API endpoints
* Redirect to appropriate pages based on user role

**Prisma ORM (`lib/prisma.ts`)**:
* Singleton PostgreSQL client
* Connection pooling
* Query optimization with indexed lookups
* Data migration support

---

### 3.3 Database Layer

#### **Type**: PostgreSQL (SQL/Relational)

#### **Role in the System**

The database is the **authoritative source of truth** for all application state:
* User accounts and authentication data
* Project definitions and metadata
* Group memberships and relationships
* Evaluation criteria and submissions
* Chat messages and conversations
* Notifications and their delivery status
* Resource requests and approvals
* Meeting schedules and reminders
* Panel assignments and scores

#### **Key Entities & Schema**

**(Refer to `prisma/schema.prisma` for full schema definition)**

**Core User Model**:
```
User (user_id, name, email, password_hash, role, status, profile_image, timestamps)
  └─ Related to: Admin, Student, Supervisor, Coordinator
```

**Campus & Organizational**:
```
Campus (campus_id, name, location, max_coordinators)
  ├─ FYPCoordinator (coordinator_id, user_id, campus_id)
  ├─ FYPSupervisor (supervisor_id, user_id, campus_id, specialization, domains, max_groups)
  └─ Student (student_id, user_id, campus_id, roll_number, batch, gpa, skills, interests)
```

**Groups & Projects**:
```
Group (group_id, group_name, group_image, project_id, created_by_id, supervisor_id, is_full)
  ├─ Student (relationship: many students per group)
  ├─ GroupInvitation (supervisor/student join requests)
  ├─ Meeting (scheduled meetings)
  └─ GroupChat (links to Conversation)

Project (project_id, title, description, abstract_text, status, visibility, document_url)
  ├─ Stores: embedding_id (Pinecone), similarity_score, feasibility_report (JSON)
  ├─ Related: created_by, group, campus
  └─ Statuses: idea, in_progress, completed, archived, taken
```

**Chat & Messaging**:
```
Conversation (conversation_id, timestamps)
  ├─ ConversationParticipant (many users, last_read_at)
  └─ Message (message_id, sender_id, content, attachments, is_read, timestamps)

GroupChat (group_id, conversation_id)
  └─ Links Group to Conversation for group messaging

PinnedConversation (user_id, conversation_id)
  └─ User's pinned chats
```

**Invitations & Requests**:
```
Invitation (invitation_id, sender_id, receiver_id, status, type, message)
  └─ Student-to-student group formation invites

GroupInvitation (id, group_id, invitee_id, invitee_role, status, message)
  └─ Group inviting supervisors or students

IndustrialProject (id, title, description, tech_stack, status, campus_id)
  └─ Uploaded by coordinators/supervisors for groups to request

IndustrialProjectRequest (id, project_id, requester_id, group_id, status)
  └─ Group requesting assignment to industrial project

ProjectPermissionRequest (id, project_id, requester_id, owner_id, status)
  └─ Student requesting to fork/use supervisor's project
```

**Notifications**:
```
Notification (notification_id, title, message, type, target_type, created_by_id, campus_id)
  └─ NotificationRecipient (user_id, is_read, read_at)
      └─ Many recipients per notification (broadcast support)
```

**Evaluations**:
```
Evaluation (evaluation_id, title, description, total_marks, due_date, status, created_by_id, campus_id)
  ├─ EvaluationAttachment (file_name, file_url, file_size)
  └─ EvaluationSubmission (group_id, status, obtained_marks, feedback, timestamps)
       ├─ Supervisor Score (supervisor_score, supervisor_feedback, supervisor_scored_by)
       ├─ Panel Score (panel_score, panel_feedback, panel_scored_by)
       └─ SubmissionAttachment (file uploads from groups)
```

**Evaluation Panels**:
```
EvaluationPanel (panel_id, name, evaluation_type, min/max_supervisors, status, campus_id)
  ├─ PanelMember (supervisor_id, role: chair/member/external)
  └─ GroupPanelAssignment (group_id, evaluation_date, time_slot, venue, score)
       └─ PanelComment (comment_id, user_id, content, timestamps)
```

**Tasks & Meetings**:
```
ProjectTask (task_id, group_id, title, description, assigned_to, status, priority, due_date)
  └─ For tracking work within groups

Meeting (meeting_id, group_id, title, description, meeting_link, scheduled_at, status)
  ├─ created_by_id, created_by_role (student/supervisor/coordinator)
  └─ MeetingEmailReminder (reminder_type, send_at, sent, sent_at)
       └─ Background job monitors and sends email reminders
```

**Resource Management**:
```
ResourceRequest (id, group_id, title, description, resource_type, items, justification, status)
  ├─ Supervisor Review: supervisor_id, supervisor_note, supervisor_action
  ├─ Coordinator Review: coordinator_id, coordinator_note, meeting_date, meeting_link
  └─ Statuses: pending → supervisor_approved → coordinator_review → approved/rejected
```

**Others**:
```
PasswordResetToken (id, user_id, token, expires_at, used)
  └─ For password reset flow (one-time use)

Admin (admin_id, user_id)
  └─ One-to-one mapping for admin role
```

#### **Indexing Strategy**

Critical indexes for query performance:
```prisma
Campus:
  - Default PK on campus_id

Student:
  @@index([campusId])
  @@index([groupId])
  @@index([campusId, groupId])

Group:
  @@index([supervisorId])
  @@index([createdById])

Project:
  @@index([campusId])
  @@index([campusId, visibility])
  @@index([groupId])
  @@index([createdById])
  @@index([status])

Message:
  @@index([conversationId, createdAt])
  @@index([senderId])
  @@index([conversationId, isRead])

EvaluationSubmission:
  @@index([evaluationId])
  @@index([groupId])
  @@index([submittedById])
  @@index([status])

ResourceRequest:
  @@index([groupId])
  @@index([campusId])
  @@index([status])
  @@index([supervisorId])
```

#### **Unique Constraints**

* Email uniqueness (users login by email)
* Roll number uniqueness (student identification)
* One-to-one relationships (User→Admin, User→Student, User→Supervisor, User→Coordinator)
* Unique invitations (prevent duplicate requests)
* Unique conversational participants (one record per user per conversation)

---

### 3.4 External Services & Integrations

#### **3.4.1 Cohere AI (LLM Service)**

**Purpose**: Advanced natural language processing for project analysis

**Endpoints Used**:
* `chat` endpoint: For structured JSON generation (project extraction, feasibility analysis)
* Model: `command-r7b-12-2024` (fast, cost-effective, optimized for structured output)

**Responsibilities**:
1. **Project Information Extraction**: Parse raw document text to extract:
   - Project title
   - Abstract/description
   - Key features
   - Technologies/tech stack
   - Required skills

2. **Feasibility Analysis**: Generate detailed feasibility reports assessing:
   - Timeline feasibility (can be completed in 4 months)
   - Skill requirements vs. student capabilities
   - Supervisor expertise alignment
   - Suggested enhancements or scope adjustments
   - Risk factors

3. **Similarity Explanation**: Generate human-readable explanations of why projects are similar:
   - Overlapping features
   - Shared technologies
   - Duplicate functionality

**Integration Points**:
```
/api/projects/:id/check-similarity → Cohere extraction + Pinecone search
/api/projects/:id/feasibility → Cohere analysis
```

**Rate Limiting**:
* Max 5 concurrent requests (configurable queue)
* 10ms delay between requests
* 60-second timeout per request

**Error Handling**:
* Graceful degradation if Cohere is unavailable
* Cached results to avoid repeated API calls
* Detailed error logging for debugging

---

#### **3.4.2 Pinecone (Vector Database)**

**Purpose**: Semantic similarity search for project uniqueness detection

**Configuration**:
* **Index**: `project-embeddings` (1024-dimensional vectors from Cohere)
* **Namespace**: `projects` (isolated from other data)
* **Distance Metric**: Cosine similarity
* **Vector Dimension**: 1024 (from Cohere embed-english-v3.0 model)

**Responsibilities**:
1. **Upsert Project Embeddings**: Store project vector + metadata (title, abstract, projectId)
2. **Similarity Search**: Find top-K similar projects (K=3 by default)
3. **Threshold-Based Filtering**: Return only projects with similarity > 50%
4. **Batch Operations**: Bulk upsert for data migration

**Integration Points**:
```
POST /api/projects/create → Extract features + Generate embedding → Upsert to Pinecone
POST /api/projects/:id/check-similarity → Query Pinecone for similar projects
```

**Data Flow**:
```
Raw Project Text
    ↓
[Cohere Extraction]
    ↓
Feature-based Embedding Text (optimized for semantic search)
    ↓
[Cohere Embedding Model]
    ↓
1024-dim Vector
    ↓
[Pinecone Upsert]
    ↓
Stored with metadata (projectId, title, abstract)
```

---

#### **3.4.3 Cloudflare R2 (Object Storage)**

**Purpose**: Scalable, S3-compatible file storage for documents and media

**Configuration**:
* **Bucket**: `projectify-files` (configured via `R2_BUCKET_NAME`)
* **Authentication**: Cloudflare API Token (R2_API_TOKEN)
* **Public Access**: Via custom domain (R2_PUBLIC_URL)

**Supported File Types**:
* Documents: PDF, DOCX, XLSX, TXT
* Images: PNG, JPG, GIF
* Media: MP4, WebM

**File Organization**:
```
/projects/{projectId}/document.pdf
/projects/{projectId}/thumbnail.png
/submissions/{submissionId}/file.pdf
/evaluations/{evaluationId}/attachment.docx
/users/{userId}/profile.png
```

**Responsibilities**:
1. **Project Document Upload**: Store student/supervisor project PDFs/DOCX
2. **Submission Attachments**: Store student evaluation submissions
3. **Profile Images**: User and group profile pictures
4. **Evaluation Resources**: Rubrics, guidelines, sample files
5. **Public Access**: Generate public URLs for downloading/viewing

**API Methods**:
* `uploadToR2(key, buffer, contentType)`: PUT request with Bearer token auth
* `deleteFromR2(key)`: DELETE request
* `getPublicUrl(key)`: Construct public URL from public domain

**Integration Points**:
```
POST /api/projects/create → File validation → Upload to R2 → Store URL in DB
PATCH /api/profile → Upload profile image → R2 → Update DB
POST /api/evaluations/:id/submit → Upload submission files → R2
```

---

#### **3.4.4 Brevo Email Service**

**Purpose**: Transactional email delivery (SMTP replacement)

**Endpoints**:
* `https://api.brevo.com/v3/smtp/email`: Send email

**Email Types Sent**:
1. **Password Reset**: Click-to-reset link, HTML-formatted
2. **Meeting Reminders**: 24-hour and 1-hour before scheduled meetings
3. **Notification Digests**: Optional daily/weekly summaries
4. **Evaluation Notifications**: Submission deadlines, grade notifications
5. **Invitation Confirmations**: Group/supervisor invitation updates

**Features**:
* HTML email templates with brand styling
* Plain text fallback
* Configurable sender name/email (Projectify + BREVO_SENDER_EMAIL)
* API-based (works on Railway, no SMTP required)
* HTTPS port 443 for firewall compatibility

**Integration Points**:
```
POST /api/auth/reset-password → Brevo email
Meeting scheduled → MeetingEmailReminder job → Brevo email
```

---

#### **3.4.5 Redis (Cache & Session Layer)**

**Purpose**: Real-time session management and Socket.IO scalability

**Role**:
1. **Socket.IO Adapter**: Enables multi-server WebSocket broadcasting
2. **Session Cache**: Optional for high-traffic scenarios
3. **Rate Limiting**: Track API request counts per user (future enhancement)

**Configuration**:
* Managed via ioredis library
* Cluster support for distributed deployments
* Connection pooling

**Used For**:
* Socket.IO Redis adapter (cross-server event broadcasting)
* Message queue for pending Socket events
* User online/offline status tracking

---

## 4. Component Interaction (Data Flow)

### 4.1 User Authentication Flow

```
┌─────────────────┐
│     Frontend    │
└────────┬────────┘
         │ POST /api/auth/signin
         │ { identifier, password }
         ↓
┌─────────────────────────────────────┐
│   NextAuth Credential Provider      │
│  (/api/auth/[...nextauth]/route.ts) │
└────────┬────────────────────────────┘
         │ Validate credentials
         ├─ Query user by email/roll_number (optimized single query)
         ├─ Check status (ACTIVE/SUSPENDED/REMOVED)
         └─ Hash password comparison via bcryptjs
         ↓
┌─────────────────┐
│   PostgreSQL    │
│   (User table)  │
└────────┬────────┘
         │ User + role + campus data
         ↓
┌─────────────────────────────────────┐
│  JWT Token Generation & Storage     │
│  (Encrypted session cookie)         │
└────────┬────────────────────────────┘
         │ Set HttpOnly cookie
         ↓
┌─────────────────┐
│     Frontend    │
│  Session stored │
└─────────────────┘
```

**Key Points**:
* Single optimized query for user lookup (email OR roll_number)
* Password hashed with bcryptjs (10 salt rounds from seed)
* JWT encrypted and stored as HTTP-only cookie
* Suspended users get special redirect to suspended page
* Session data includes userId, email, name, role, campusId, student/supervisor metadata

---

### 4.2 Project Creation & Similarity Check Flow

```
┌──────────────────────────────────────┐
│   Student/Supervisor uploads PDF/DOCX │
│   with project proposal              │
└────────┬─────────────────────────────┘
         │ POST /api/projects/create
         │ { title, file, description }
         ↓
┌──────────────────────────────────┐
│   File Validation & Upload       │
│   - Type check (PDF/DOCX)        │
│   - Size limits                  │
│   - Upload to R2                 │
└────────┬─────────────────────────┘
         │ Store URL in DB
         ↓
┌──────────────────────────────────┐
│  Document Text Extraction        │
│  - PDF: pdf-parse                │
│  - DOCX: mammoth + adm-zip       │
│  - Clean & normalize text        │
└────────┬─────────────────────────┘
         │ Raw document text (5000-15000 chars)
         ↓
┌───────────────────────────────────────┐
│  Cohere AI Information Extraction     │
│  - Title, abstract, features          │
│  - Tech stack, skills required        │
│  - Generate embedding text            │
└────────┬──────────────────────────────┘
         │ Structured JSON output
         ↓
┌───────────────────────────────────────┐
│  Cohere Embedding Generation          │
│  - Model: embed-english-v3.0          │
│  - Input type: search_document        │
│  - Output: 1024-dim vector            │
└────────┬──────────────────────────────┘
         │ Embedding vector
         ↓
┌───────────────────────────────────────┐
│  Pinecone Similarity Search           │
│  - Query with generated embedding     │
│  - Retrieve top 3 similar projects    │
│  - Cosine similarity scores           │
└────────┬──────────────────────────────┘
         │ [ { projectId, score, metadata } ]
         ↓
┌───────────────────────────────────────┐
│  Similarity Threshold Check           │
│  - If any score > 50% similarity      │
│  - Flag as "Not Unique"               │
│  - Generate explanation via Cohere    │
└────────┬──────────────────────────────┘
         │
    ┌────┴─────┬──────────────┐
    │           │              │
    ↓           ↓              ↓
Unique      Duplicate    Similar (warn)
    │           │              │
    ├───────────┴──────────────┤
    │                          │
    ↓                          ↓
┌────────────────┐  ┌─────────────────────┐
│ Upsert to      │  │ Return similarity   │
│ Pinecone       │  │ report to user      │
│ Store vector   │  │ (user may revise)   │
│ + metadata     │  └─────────────────────┘
└────────┬───────┘
         │
         ↓
┌───────────────────────────────────────┐
│  Feasibility Analysis (Cohere)        │
│  - Timeline assessment (4 months?)    │
│  - Skill requirements vs. student     │
│  - Supervisor expertise match         │
│  - Suggested improvements             │
└────────┬──────────────────────────────┘
         │ Feasibility JSON report
         │
         ↓
┌───────────────────────────────────────┐
│  Create Project Record in Database    │
│  - Store all metadata, URLs           │
│  - embedding_id (Pinecone ID)         │
│  - similarity_score                   │
│  - feasibility_report (JSON)          │
│  - isUnique flag                      │
└────────┬──────────────────────────────┘
         │ projectId
         │
         ↓
┌────────────────────────────────────┐
│  Return to Frontend                │
│  - Project created successfully    │
│  - Similarity warnings (if any)    │
│  - Feasibility assessment          │
└────────────────────────────────────┘
```

**Key Points**:
* Entire flow is transactional within API endpoint
* Cohere extraction is required for feasibility
* Pinecone is optional but recommended for uniqueness
* Results cached in project record for future reference
* User can still create project even if flagged as duplicate (not a hard block)

---

### 4.3 Group Formation & Supervisor Matching Flow

```
┌──────────────────────────────┐
│  Student 1: Create Group     │
│  POST /api/groups/create     │
│  { groupName, groupImage }   │
└────────┬─────────────────────┘
         │
         ↓
┌──────────────────────────────┐
│  Database: Create Group      │
│  - group_id (auto)           │
│  - created_by_id = student1  │
│  - supervisor_id = NULL      │
│  - is_full = false           │
└────────┬─────────────────────┘
         │
         ↓
┌──────────────────────────────────┐
│  Student 1: Add Students         │
│  GET /api/student/browse-peers   │
│  (Search students in campus)     │
└────────┬───────────────────────┘
         │
         ↓
┌──────────────────────────────────┐
│  Query: Find available students  │
│  WHERE campus_id = ?             │
│  AND group_id IS NULL            │
│  AND student_id != current_user  │
└────────┬───────────────────────┘
         │ [ peers ]
         ↓
┌──────────────────────────────────┐
│  Student 1: Send Invitation      │
│  POST /api/student/invitations   │
│  { sender_id, receiver_id,       │
│    type: "group_invite" }        │
└────────┬───────────────────────┘
         │
         ↓
┌──────────────────────────────┐
│  Database: Create            │
│  Invitation record           │
│  status = "pending"          │
└────────┬─────────────────────┘
         │
         ↓
┌──────────────────────────────────┐
│  Socket.IO Event                 │
│  → Student 2: 'invitation:new'   │
│  (Real-time notification)        │
└────────┬───────────────────────┘
         │
         ↓
┌──────────────────────────────────┐
│  Student 2: Accept Invitation    │
│  PATCH /api/student/invitations/:id │
│  { status: "accepted" }          │
└────────┬───────────────────────┘
         │
         ↓
┌──────────────────────────────┐
│  Update Student Record       │
│  SET group_id = group.id     │
│  (now part of group)         │
└────────┬─────────────────────┘
         │
         ↓
┌──────────────────────────────┐
│  Create GroupChat (auto)     │
│  - New Conversation          │
│  - Add both students         │
│  - Link to Group             │
└────────┬─────────────────────┘
         │
         ↓
┌──────────────────────────────────┐
│  Repeat: Add 3rd student         │
│  (Same flow)                     │
└────────┬───────────────────────┘
         │
         ↓
┌──────────────────────────────────┐
│  Group Complete: 3 Students      │
│  Now find Supervisor             │
│  GET /api/student/browse-         │
│  supervisors                      │
└────────┬───────────────────────┘
         │
         ↓
┌──────────────────────────────┐
│  Query Available Supervisors │
│  WHERE campus_id = ?         │
│  AND total_groups < max_groups │
│  (Filter by expertise)       │
└────────┬─────────────────────┘
         │ [ supervisors ]
         ↓
┌──────────────────────────────────┐
│  Group: Invite Supervisor        │
│  POST /api/groups/:id/invite-    │
│  supervisor                      │
│  { supervisor_id, message }      │
└────────┬───────────────────────┘
         │
         ↓
┌──────────────────────────────┐
│  Database: Create            │
│  GroupInvitation record      │
│  status = "pending"          │
└────────┬─────────────────────┘
         │
         ↓
┌──────────────────────────────────┐
│  Socket.IO Event                 │
│  → Supervisor: 'invitation:new'  │
│  (Real-time notification)        │
└────────┬───────────────────────┘
         │
         ↓
┌──────────────────────────────────┐
│  Supervisor: Accept Group        │
│  PATCH /api/supervisor/requests/:id │
│  { status: "accepted" }          │
└────────┬───────────────────────┘
         │
         ↓
┌──────────────────────────────┐
│  Update Group Record         │
│  SET supervisor_id = ?       │
│  SET is_full = true          │
│  Increment total_groups      │
└────────┬─────────────────────┘
         │
         ↓
┌──────────────────────────────────┐
│  Create GroupChat (auto)         │
│  - Add supervisor to conv.       │
│  - Supervisor can now message    │
│  - Group fully formed!           │
└────────────────────────────────────┘
```

**Key Points**:
* Group formation is multi-step (add peers → find supervisor)
* Invitations are tracked and can be rejected/cancelled
* Group becomes "full" when 3 students + 1 supervisor
* Automatic creation of group chats for seamless communication
* Socket.IO enables real-time invitation notifications

---

### 4.4 Real-time Chat & Messaging Flow

```
┌─────────────────────────┐
│   Frontend: Send Msg    │
│   Socket.emit('chat:    │
│   send', {conversationId,│
│   content, attachment}) │
└────────┬────────────────┘
         │
         ↓
┌──────────────────────────────────────┐
│  Socket.IO Server (/api/socketio)    │
│  - Receive event in room             │
│  - Validate userId, conversationId   │
└────────┬─────────────────────────────┘
         │
         ↓
┌──────────────────────────────────────┐
│  API Endpoint:                       │
│  POST /api/chat/conversations/:id/   │
│  messages                            │
│  - Validate sender is participant    │
│  - Store message to DB               │
│  - Get sender profile info           │
└────────┬─────────────────────────────┘
         │
         ↓
┌──────────────────────────────┐
│  Database: Insert Message    │
│  - messageId (auto)          │
│  - conversationId            │
│  - senderId                  │
│  - content                   │
│  - attachmentUrl (if any)    │
│  - isRead = false            │
│  - timestamps                │
└────────┬─────────────────────┘
         │ Message created
         ↓
┌──────────────────────────────────────┐
│  Socket.IO Broadcast                 │
│  io.to(conversationId).emit          │
│  ('chat:message', {                  │
│    messageId, senderId, content,     │
│    sender profile, attachments,      │
│    createdAt                         │
│  })                                  │
└────────┬─────────────────────────────┘
         │
         ├─────────────────────────────────┐
         │ (to all users in conversation)  │
         │                                 │
         ↓                                 ↓
    ┌─────────────┐          ┌─────────────┐
    │  Sender     │          │  Recipient  │
    │  (chat UI)  │          │  (chat UI)  │
    │  Updates    │          │  Updates    │
    │  message    │          │  message    │
    │  sent list  │          │  receives   │
    └─────────────┘          └─────────────┘
```

**Typing Indicator Flow**:
```
User starts typing → Socket.emit('chat:typing', {isTyping: true})
                  ↓
Server broadcasts to room → Other users see "User is typing..."
                  ↓
User stops typing → Socket.emit('chat:typing', {isTyping: false})
```

**Read Status Flow**:
```
User opens message → Socket.emit('chat:mark-read', {conversationId})
                   ↓
Server updates Message.isRead = true
          updates ConversationParticipant.lastReadAt
                   ↓
Server broadcasts 'chat:read' event
                   ↓
Sender sees message marked as read (checkmark)
```

**Attachment Handling**:
```
User selects file to attach
  ↓
Frontend: Upload to R2 directly (pre-signed URL)
  ↓
Get back public URL
  ↓
Send message with attachmentUrl, attachmentType, attachmentName
  ↓
Stored in Message record
  ↓
Recipient can view/download from public R2 URL
```

---

### 4.5 Evaluation & Scoring Flow

```
┌──────────────────────────────┐
│  Coordinator: Create         │
│  Evaluation Announcement     │
│  POST /api/evaluations/      │
│  create                      │
│  { title, description, dueDate,   │
│    totalMarks, attachments } │
└────────┬─────────────────────┘
         │
         ↓
┌──────────────────────────────────┐
│  Upload attachments to R2         │
│  (rubrics, guidelines, etc)       │
│  Store URLs in EvaluationAttach.. │
└────────┬───────────────────────┘
         │
         ↓
┌──────────────────────────────────┐
│  Database: Create Evaluation     │
│  - evaluationId (auto)           │
│  - status = "active"             │
│  - campus_id                     │
│  - dueDate                       │
└────────┬───────────────────────┘
         │
         ↓
┌──────────────────────────────────────┐
│  Notification Broadcast              │
│  - Create Notification record        │
│  - Set target = all_students campus  │
│  - Send email to all students        │
│  - Socket.IO event 'notification:new'│
└────────┬───────────────────────────┘
         │
         ↓
┌──────────────────────────────┐
│  Group: View Evaluation      │
│  GET /api/evaluations        │
│  - List active evaluations   │
│  - Download attachments      │
│  - See due date              │
└────────┬─────────────────────┘
         │
         ↓
┌──────────────────────────────┐
│  Group: Submit Response      │
│  POST /api/evaluations/:id/  │
│  submit                      │
│  { content, attachments }    │
└────────┬─────────────────────┘
         │
         ↓
┌──────────────────────────────────────┐
│  Upload submission files to R2        │
│  Store URLs in SubmissionAttachment.. │
└────────┬───────────────────────────┘
         │
         ↓
┌──────────────────────────────────┐
│  Database: Create Submission     │
│  - submissionId (auto)           │
│  - evaluationId, groupId         │
│  - submittedById (student user)  │
│  - status = "submitted"          │
│  - submittedAt = now             │
└────────┬───────────────────────┘
         │
         ↓
┌──────────────────────────────────────┐
│  Supervisor: Grade Submission        │
│  PATCH /api/evaluations/:id/grade    │
│  { submissionId, obtainedMarks,      │
│    feedback, supervisorScore }       │
└────────┬───────────────────────────┘
         │
         ↓
┌──────────────────────────────────┐
│  Update Submission Record        │
│  - obtained_marks (if set)       │
│  - supervisorScore               │
│  - supervisorFeedback            │
│  - supervisorScoredById          │
│  - supervisorScoredAt = now      │
└────────┬───────────────────────┘
         │
         ↓
┌──────────────────────────────────────┐
│  Notification to Group               │
│  - Socket.IO 'evaluation:comment'    │
│  - Email digest (optional)           │
│  - In-app notification              │
└────────┬───────────────────────────┘
         │
         ↓
┌──────────────────────────────────┐
│  Group: View Feedback            │
│  GET /api/evaluations/:id        │
│  - See obtained marks            │
│  - Read supervisor feedback      │
│  - Compare to rubric             │
└────────────────────────────────────┘
```

**Evaluation Panel Scoring**:
```
Panel Assigned to Group
  ↓
Panel meeting held (scheduled_date)
  ↓
Panel chair scores group:
PATCH /api/evaluation-panels/:panelId/score
  { groupId, score, feedback }
  ↓
Update GroupPanelAssignment:
- score (out of 100)
- scoredById (panel chair user_id)
- scoredAt = now
  ↓
Panel members add comments:
POST /api/evaluation-panels/:id/groups/:groupId/comments
  { commentId, userId, content }
  ↓
Store in PanelComment table
  ↓
Notification to group + supervisor
```

---

### 4.6 Resource Request Approval Workflow

```
┌──────────────────────────────┐
│  Group: Request Resources    │
│  POST /api/resource-requests │
│  { title, description,       │
│    items (JSON), type }      │
└────────┬─────────────────────┘
         │
         ↓
┌──────────────────────────────────┐
│  Create ResourceRequest record   │
│  - status = "pending"            │
│  - items stored as JSON array    │
│  - justification text            │
└────────┬───────────────────────┘
         │
         ↓
┌──────────────────────────────────┐
│  Supervisor Review               │
│  PATCH /api/resource-requests/   │
│  :id/review                      │
│  { action: approved/rejected,    │
│    note }                        │
└────────┬───────────────────────┘
         │
         ├─────────────────┬──────────────┐
         │                 │              │
      approved          rejected         ...
         │                 │
         ↓                 ↓
   ┌──────────┐   ┌────────────────┐
   │status =  │   │status =        │
   │supervisor│   │supervisor_     │
   │_approved │   │rejected        │
   └────┬─────┘   └────┬──────────┘
        │              │
        │         ┌────┴─────────┐
        │         │              │
        │         ↓              ↓
        │    Notify Group   Notify Group
        │    (rejected)     (rejected)
        │
        ├─ If forwarded to coordinator
        │
        ↓
┌──────────────────────────────────────┐
│  Coordinator Review                  │
│  PATCH /api/resource-requests/:id/   │
│  meeting                             │
│  { status: meeting_scheduled,        │
│    meetingDate, meetingLink }        │
└────────┬───────────────────────────┘
         │
         ↓
┌──────────────────────────────────┐
│  Send Meeting Invitations        │
│  - Email to group leader         │
│  - Socket.IO notification        │
│  - Include meeting details       │
└────────┬───────────────────────┘
         │
         ↓
┌──────────────────────────────────────┐
│  Group Attends Meeting & Discussion  │
│  Can happen via Zoom link or in-person│
└────────┬───────────────────────────┘
         │
         ↓
┌──────────────────────────────────┐
│  Coordinator Final Decision      │
│  PATCH /api/resource-requests/:id│
│  { status: approved/rejected,    │
│    coordinatorNote }             │
└────────┬───────────────────────┘
         │
         ├──────────────┬──────────────┐
         │              │              │
      approved        rejected    (final)
         │              │
         ↓              ↓
    ┌─────────┐  ┌──────────┐
    │Notify   │  │Notify    │
    │group    │  │group     │
    │approved │  │rejected  │
    └─────────┘  └──────────┘
```

---

## 5. Communication Patterns

### 5.1 HTTP/REST Communication

**Request Flow**:
```
Frontend (Browser)
  ↓
Next.js API Route (/api/...)
  ↓
Prisma Query / Business Logic
  ↓
PostgreSQL Database
  ↓
Response (JSON)
  ↓
Frontend (Parse & Update UI)
```

**Protocol**: HTTPS (enforced in production)
**Authentication**: JWT token in HTTP-only cookie (set by NextAuth)
**Error Handling**: Standard HTTP status codes + JSON error messages

**Request/Response Example**:
```http
POST /api/groups/:id/invite-supervisor HTTP/1.1
Authorization: Bearer <JWT in cookie>
Content-Type: application/json

{
  "supervisorId": 42,
  "message": "We'd love your mentorship!"
}

---

HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "invitationId": 123,
  "status": "pending"
}
```

### 5.2 WebSocket Communication (Socket.IO)

**Server**: Node.js HTTP server + Socket.IO library
**Path**: `/api/socketio` (configured in Next.js)
**Transports**: WebSocket (primary) + HTTP Long-polling (fallback)
**Scalability**: Redis adapter for multi-server deployments

**Connection Handshake**:
```javascript
Client connects
  ↓
Socket authenticated with userId, role, campusId
  ↓
Auto-join rooms:
  - user:{userId} (personal notifications)
  - campus:{campusId} (campus-wide broadcasts)
  - conversation:{conversationId} (chat participants)
  ↓
Server emits 'user:online' to campus room
```

**Example Event Flow**:

**Chat Message Broadcast**:
```javascript
Client: socket.emit('chat:send', {
  conversationId: 5,
  content: 'Hello team!',
  attachmentUrl: 'https://r2.../file.pdf'
})

↓

Server:
  1. Validate sender is conversation participant
  2. Insert message to database
  3. Get sender profile info
  4. Emit to room 'conversation:5':
     socket.emit('chat:message', {
       messageId: 101,
       conversationId: 5,
       senderId: 10,
       content: 'Hello team!',
       sender: { userId: 10, name: 'Ali', role: 'student' },
       attachmentUrl: '...',
       createdAt: '2024-03-18T...'
     })

↓

All clients in room receive and update UI
```

**Room Management**:
```
When user opens conversation:
  socket.emit('room:join', { roomId: 'conversation:5' })
  → Server adds socket to room

When user closes conversation:
  socket.emit('room:leave', { roomId: 'conversation:5' })
  → Server removes socket from room
```

**Event Categories**:

| Category | Events | Purpose |
|----------|--------|---------|
| **Chat** | chat:send, chat:delete, chat:typing, chat:mark-read | Messaging |
| **Notifications** | notification:new, notification:read | Push notifications |
| **Presence** | user:online, user:offline | Online status |
| **Permissions** | permission:request, permission:response | Access requests |
| **Project Status** | project:status | Real-time status updates |
| **Invitations** | invitation:new, invitation:updated | Invite notifications |
| **Groups** | group:updated | Group membership changes |
| **Evaluations** | evaluation:comment | Feedback notifications |

### 5.3 Synchronous vs Asynchronous Communication

**Synchronous (Request-Response)**:
* RESTful API calls where immediate response is needed
* Form submissions, authentication, data queries
* Blocking operation until response received

**Asynchronous (Fire-and-Forget)**:
* Background jobs (meeting reminders via cron)
* Email sending (via Brevo)
* Socket.IO events (non-blocking UI updates)
* Notification broadcasts

**Example: Async Email on Meeting Creation**:
```
POST /api/supervisor/meetings (sync)
  ├─ Create Meeting record (sync)
  ├─ Return 200 OK (sync)
  └─ Queue email reminders (async, background job)
      ├─ 24h before: Send email (cron job)
      ├─ 1h before: Send email (cron job)
      └─ Mark as sent in database
```

---

## 6. Deployment Overview

### 6.1 Deployment Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                      PRODUCTION ENVIRONMENT                   │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                    Railway Platform (PaaS)                    │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │         Next.js App (Node.js Runtime)                  │  │
│  │                                                        │  │
│  │  - API Routes (/api/*)                                │  │
│  │  - Server-Side Rendering (RSC)                        │  │
│  │  - Static Assets                                      │  │
│  │  - Socket.IO Server                                   │  │
│  │                                                        │  │
│  │  Health Check: /api/health                            │  │
│  │  Port: 3000 (internal) → Environment PORT (80/443)    │  │
│  └────────────────────────────────────────────────────────┘  │
│                         ↓                                     │
│  ┌────────────────────────────────────────────────────────┐  │
│  │              PostgreSQL Database                       │  │
│  │  (Railway-managed PostgreSQL instance)                 │  │
│  │                                                        │  │
│  │  - Connection: DATABASE_URL env var                   │  │
│  │  - Prisma ORM                                         │  │
│  │  - Connection pooling (PgBouncer)                     │  │
│  └───────────────────────────────────────s─────────────────┘  │
│                                                               │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                  EXTERNAL SERVICES (Cloud)                    │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────┐      ┌─────────────────┐               │
│  │  Cloudflare R2  │      │  Pinecone       │               │
│  │  (File Storage) │      │  (Vector DB)    │               │
│  │  - Bucket       │      │  - Embeddings   │               │
│  │  - Public URLs  │      │  - Similarity   │               │
│  └─────────────────┘      └─────────────────┘               │
│                                                               │
│  ┌─────────────────┐      ┌─────────────────┐               │
│  │  Cohere API     │      │  Brevo Email    │               │
│  │  (AI/LLM)       │      │  (SMTP)         │               │
│  │  - Extraction   │      │  - Transactional│               │
│  │  - Feasibility  │      │  - Reminders    │               │
│  └─────────────────┘      └─────────────────┘               │
│                                                               │
│  ┌─────────────────┐                                         │
│  │  Redis (Cache)  │  (Optional, for Socket.IO scaling)    │
│  │  - Sessions     │                                         │
│  │  - Pub/Sub      │                                         │
│  └─────────────────┘                                         │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

### 6.2 Environment Configuration

**Environment Variables** (`.env` file or Railway environment):

```bash
# Database
DATABASE_URL=postgresql://user:pass@db:5432/projectify

# Next.js
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://projectify.up.railway.app

# Authentication
NEXTAUTH_SECRET=<generated-secret>
NEXTAUTH_URL=https://projectify.up.railway.app

# Cloudflare R2
R2_ACCOUNT_ID=<account-id>
R2_BUCKET_NAME=projectify-files
R2_API_TOKEN=<api-token>
R2_PUBLIC_URL=https://files.projectify.example.com

# Cohere AI
cohere_api_key=<api-key>
COHERE_MODEL=command-r7b-12-2024

# Pinecone
PINECONE_API_KEY=<api-key>
PINECONE_INDEX_NAME=project-embeddings

# Brevo Email
BREVO_API_KEY=<api-key>
BREVO_SENDER_EMAIL=noreply@projectify.example.com

# Redis (optional)
REDIS_URL=redis://user:pass@redis:6379

# Server Port
PORT=3000
```

### 6.3 Build & Deployment Process

**Build Phase**:
```bash
# 1. Install dependencies
npm install

# 2. Generate Prisma client
prisma generate

# 3. Build Next.js application
next build

# Output: .next/ folder (optimized production build)
```

**Runtime Phase** (Railway):
```bash
# 1. Start server (custom via server.js)
node server.js

# Responsibilities:
# - Create HTTP server
# - Initialize Socket.IO
# - Start meeting reminder scheduler (cron job)
# - Handle API requests via Next.js
```

**Database Migration** (if schema changed):
```bash
# On deployment (automated via CI/CD):
npx prisma migrate deploy
```

### 6.4 Scaling Considerations

**Horizontal Scaling** (Multiple Instances):
* Railway automatically scales replicas
* Redis adapter enables Socket.IO broadcasts across instances
* Stateless API design (session state in JWT + DB)
* Database connection pooling (PgBouncer) manages connections

**Load Balancing**:
* Railway's built-in load balancer distributes requests
* Sticky sessions for WebSocket connections (session affinity)

**Database Scaling**:
* Indexes on frequently queried columns
* Connection pooling to prevent exhaustion
* Query optimization (select only needed fields)
* Potential read replicas for reporting

**File Storage Scaling**:
* Cloudflare R2 automatically scales (serverless CDN)
* Built-in caching (24-hour TTL for images)

---

## 7. Key Design Decisions

### 7.1 Monolithic vs. Microservices

**Decision**: **Monolithic Architecture**

**Reasoning**:
* **Simplicity**: Single deployment unit, easier development & testing
* **Performance**: No inter-service latency or network overhead
* **Transactions**: ACID guarantees within single database
* **Development Velocity**: Faster iteration, single tech stack (Node.js)
* **Cost**: Minimal infrastructure complexity (single Railway service)

**Trade-offs**:
* Limited independent scaling of components
* All features share same server resources
* Deployment is all-or-nothing
* Could be refactored to microservices if specific components need isolation

---

### 7.2 Technology Choices

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Frontend Framework** | Next.js 14 | Built-in SSR, API routes, fast builds, excellent DX |
| **UI Library** | React 18 | Component reusability, large ecosystem, performance |
| **Styling** | Tailwind CSS | Utility-first, rapid development, consistent design |
| **Authentication** | NextAuth v5 | OAuth-ready, credential support, JWT sessions |
| **Database** | PostgreSQL | ACID compliance, JSON support, scalable |
| **ORM** | Prisma | Type-safe, migrations, excellent DX, code generation |
| **Real-time** | Socket.IO | Mature, fallback transports, Redis adapter for scaling |
| **AI/LLM** | Cohere | Fast inference, structured JSON, cost-effective |
| **Vector DB** | Pinecone | Managed service, no infrastructure, semantic search |
| **File Storage** | Cloudflare R2 | S3 compatible, affordable, global CDN |
| **Email** | Brevo | Reliable transactional email, API-based (Railway friendly) |
| **Language** | TypeScript | Type safety, compile-time error catching, better IDE support |
| **Deployment** | Railway | Simple PaaS, environment management, GitHub integration |

---

### 7.3 Key Design Principles

1. **Type Safety**: Full TypeScript for API contracts and database interactions
2. **Separation of Concerns**: Clear layers (UI, API, Database)
3. **Real-time First**: WebSocket for live updates, HTTP for state-changing ops
4. **Async-by-Default**: Background jobs for non-blocking operations
5. **Scalability**: Stateless API, Redis for distributed Socket.IO
6. **Security**: JWT in HTTP-only cookies, role-based access control, environment secrets
7. **Data Integrity**: Prisma transactions for multi-step operations
8. **Performance**: Indexed queries, image optimization, SWC minification

---

## 8. Scalability Considerations

### 8.1 Current Architecture Limits

**Single Server Bottlenecks**:
* CPU: Cohere API calls + document processing (blocking)
* Memory: Large file uploads, message history queries
* Network: WebSocket connections (1 server limit)
* Database: Connection pool exhaustion under high load

**Recommended Thresholds**:
* ~2,000 concurrent Socket.IO connections per server
* ~500 API requests/sec per server
* ~100 active chat conversations

### 8.2 Scaling Strategies

**Vertical Scaling** (Increase Server Resources):
```
Problem: Single server CPU bottleneck
Solution: Upgrade Railway plan → more CPU/RAM
Cost: Increases continuously with resource size
```

**Horizontal Scaling** (Multiple Server Instances):
```
Problem: Need to handle 5,000+ concurrent connections
Solution:
1. Deploy multiple Next.js replicas on Railway
2. Use Redis adapter for Socket.IO message broadcasting
3. Database connection pooling (PgBouncer)
4. Load balancer distributes requests

Architecture:
┌─────────────┐     ┌─────────────┐
│ Instance 1  │     │ Instance 2  │
│ (Next.js)   │ ←→  │ (Next.js)   │
└──────┬──────┘     └──────┬──────┘
       │                   │
       └───────┬───────────┘
               │
         ┌─────▼─────┐
         │  Redis    │
         │  Adapter  │
         └───────────┘
```

**Database Read Replicas**:
```
Problem: Analytics queries slow down transactional DB
Solution:
1. PostgreSQL read replica on Railway
2. Route reporting queries to replica
3. Keep transactional writes on primary

Benefits:
- No impact on live user queries
- Parallel query execution
```

**Caching Layer** (Redis):
```
Problem: Repeated queries slow down API
Solution:
1. Cache frequently accessed data (supervisor list, campus settings)
2. TTL-based expiration (5-30 min depending on data)
3. Invalidate on mutations

Example:
GET /api/supervisor/browse
  ├─ Check Redis cache
  ├─ If hit: return cached list
  └─ If miss:
       ├─ Query DB
       ├─ Set Redis with TTL
       └─ Return results
```

**File Storage Caching**:
```
Problem: R2 downloads are repeated
Solution:
1. Cloudflare CDN caching (24-hour TTL already configured)
2. Browser caching (Cache-Control headers)
3. Thumbnails for images (pre-generate small versions)

Benefits:
- Reduced R2 bandwidth costs
- Faster downloads for users
- Geographic distribution (Cloudflare global network)
```

**Async Job Processing**:
```
Problem: Long-running tasks (Cohere API) block requests
Solution:
1. Move to background job queue
2. Use job processor (Bull, RabbitMQ, or AWS SQS)
3. Return job ID immediately, poll for status

Current Implementation:
- Synchronous (Cohere called in API endpoint)

Future:
- POST /api/projects/check-similarity → Returns jobId
- WebSocket: 'project:similarity-complete' when done
```

**API Rate Limiting**:
```
Problem: Prevent abuse of Cohere API (expensive)
Solution:
1. Track requests per user
2. Implement token bucket algorithm
3. Return 429 Too Many Requests

Example:
- Student: max 5 similarity checks/day
- Supervisor: max 20/day
- Coordinator: unlimited
```

**Database Optimization**:
```
Current Indexes: (See schema section)
Future Improvements:
- Composite indexes on frequently filtered column combinations
- Partial indexes on status=active (evaluation queries)
- JSONB indexes for feasibility_report searches
- Materialized views for dashboard aggregations
```

### 8.3 Cost Scaling

| Component | Current Cost | At 10x Scale | At 100x Scale |
|-----------|--------------|--------------|---------------|
| Railway (Compute) | $50-100/mo | $200-500/mo | $1000-5000/mo* |
| PostgreSQL | Included | Included | +$300-1000/mo |
| Cloudflare R2 | $20-50/mo | $50-200/mo | $200-1000/mo |
| Cohere API | $0-50/mo | $50-500/mo | $500-5000/mo** |
| Pinecone | $0-50/mo | $50-200/mo | $200-1000/mo |
| Redis | $0 (optional) | $10-30/mo | $50-200/mo |
| **Total** | **~$200/mo** | **~$500-1500/mo** | **~$2500-15000/mo** |

*Can optimize with async job queue + scheduled runs
**Can optimize with batch processing + caching

---

## 9. Security Considerations

### 9.1 Authentication & Authorization

**Authentication (Who are you?)**:
* **Method**: Credential-based login (email + password)
* **Storage**: Password hashed with bcryptjs (10 salt rounds)
* **Session**: JWT token in HTTP-only, Secure, SameSite cookie
* **NextAuth**: Handles session validation, CSRF protection, callback security

**Authorization (What can you do?)**:
* **Roles**: admin, student, supervisor, coordinator
* **Enforcement**: Middleware checks session role before allowing route access
* **Route Protection**:
  ```typescript
  // Example: Only supervisors can view group list
  if (session.role !== 'supervisor') {
    return NextResponse.redirect('/unauthorized');
  }
  ```
* **Database Checks**: API endpoints validate ownership/permissions
  ```typescript
  // Example: Student can only submit for their own group
  const group = await prisma.group.findUnique({
    where: { groupId },
  });
  if (group.createdById !== session.userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 403 });
  }
  ```

### 9.2 Data Protection

**At Rest**:
* Database passwords encrypted (bcryptjs)
* Files on R2 stored with access control
* Sensitive data (API keys) in environment variables, never in code
* Database backups encrypted by Railway

**In Transit**:
* HTTPS enforced in production (Railway provides TLS)
* WebSocket over wss:// (secure)
* JWT encrypted (uses NEXTAUTH_SECRET)

**Field-Level Encryption** (Not currently implemented, but recommended):
* Email addresses (PII)
* Phone numbers (if stored)
* Financial data (resource budget)

**Solution**: Use Prisma field encryption middleware or application-level encryption

### 9.3 API Security

**Input Validation**:
* TypeScript type checking
* Zod schema validation (not fully implemented, recommendation)
* File type validation (PDF/DOCX/Image only)
* File size limits (max 100MB)

**CSRF Protection**:
* NextAuth built-in CSRF tokens
* Cookie SameSite=Strict (blocks cross-site requests)

**Rate Limiting**:
* Not implemented (should add)
* Prevent brute force login attempts
* Prevent API abuse (Cohere API cost control)

**Recommendation**:
```typescript
// Implement rate limiting middleware
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: 'Too many login attempts, please try again later'
});

POST /api/auth/signin → Apply loginLimiter
```

**SQL Injection Prevention**:
* Prisma ORM prevents SQL injection (parameterized queries)
* No string concatenation in queries
* Safe from user input

**XSS Prevention**:
* React escapes user input by default
* Rich text fields validated (no HTML if not needed)
* Content Security Policy headers (recommended)

**Dependency Vulnerabilities**:
* Regular npm updates
* `npm audit` before deployment
* Security scanning via GitHub Dependabot

### 9.4 File & Storage Security

**R2 Access Control**:
* Bucket policies restrict to app only
* API token has minimal required permissions
* Public files have public URLs; private files not listed

**URL Generation**:
* Presigned URLs with expiration (for private files)
* Public URLs for documents (documents are public by visibility)

**File Type Validation**:
```typescript
const ALLOWED_TYPES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
if (!ALLOWED_TYPES.includes(file.type)) {
  throw new Error('Invalid file type');
}
```

### 9.5 User Privacy

**Data Collection**:
* Only collect necessary data (name, email, roll number, skills, interests)
* No tracking or analytics (unless explicitly added)
* No third-party integrations with user data

**Data Retention**:
* Users can delete profiles (soft delete with flag status=REMOVED)
* Suspension status prevents login but keeps data
* Historical data retained for audit trail

**GDPR/Privacy Compliance**:
* No automated profiling or decision-making
* Users own their project data
* Transparent data usage (privacy policy needed)

**Recommendation**: Implement:
* Right to deletion (GDPR)
* Data export endpoint
* Privacy policy page
* Consent management for analytics

### 9.6 Email Security

**Brevo Security**:
* HTTPS API calls only
* API key in environment variable
* Email templates don't expose sensitive data
* Password reset links single-use (token_used flag)

**Password Reset Flow**:
```
1. User requests reset → Generate random token (32 chars)
2. Store token in DB with:
   - userId
   - expiresAt (15 min from now)
   - used = false
3. Send email with reset link: /?token=<token>
4. User clicks link → Verify token (not expired, not used)
5. User sets new password → Mark token used=true
6. Prevent token reuse
```

### 9.7 Admin/Coordinator Actions

**Account Suspension**:
* Coordinator can suspend users → status=SUSPENDED
* Suspended users:
  - Cannot login (redirected to suspended page)
  - Session still valid for account page view
  - Cannot create/modify data

**Account Removal**:
* Admin can remove users → status=REMOVED
* Removed users:
  - Cannot login
  - Cannot view any data
  - Projects/data retained (for audit trail)

**Audit Logging** (Not implemented, recommendation):
* Log all admin actions (user suspension, account creation, etc)
* Timestamp, admin user ID, action, reason
* Useful for compliance and accountability

---

## 10. Error Handling & Monitoring

### 10.1 Error Handling Strategy

**Client-Side**:
```typescript
// API calls with error handling
try {
  const response = await fetch('/api/projects/create', {
    method: 'POST',
    body: JSON.stringify(formData),
  });
  
  if (!response.ok) {
    const error = await response.json();
    // Display user-friendly error message
    toast.error(error.message || 'Something went wrong');
  } else {
    const data = await response.json();
    // Success handling
  }
} catch (error) {
  toast.error('Network error. Please try again.');
}
```

**Server-Side**:
```typescript
// API route error handling
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validation
    if (!body.title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }
    
    // Business logic
    const project = await prisma.project.create({
      data: {
        title: body.title,
        // ...
      },
    });
    
    return NextResponse.json(project);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // Database error
      console.error('DB Error:', error);
      return NextResponse.json(
        { error: 'Database error' },
        { status: 500 }
      );
    }
    
    // Unknown error
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### 10.2 Logging

**Current Logging**:
* Console logs in development
* Server logs on Railway (visible in dashboard)
* Email errors logged (Brevo failures)

**Recommended Enhancements**:
```typescript
// Structured logging with timestamps
const log = {
  info: (message, context) => console.log(`[${new Date().toISOString()}] INFO: ${message}`, context),
  error: (message, error) => console.error(`[${new Date().toISOString()}] ERROR: ${message}`, error),
  warn: (message, context) => console.warn(`[${new Date().toISOString()}] WARN: ${message}`, context),
};
```

**Log Aggregation** (Future):
* Integrate with ELK Stack, Datadog, or LogRocket
* Central logging for all instances
* Searchable and alertable logs

### 10.3 Monitoring & Alerts

**Health Checks**:
* Railway automatically health checks `/api/health`
* Returns 200 if server running
* Restarts on failed checks

**Recommended Monitors**:
| Metric | Alert Threshold | Action |
|--------|-----------------|--------|
| Response Time | > 5s (p95) | Investigate slow queries |
| Error Rate | > 5% (5xx errors) | Check logs, rollback if needed |
| Database Connections | > 90% of pool | Increase pool size |
| Disk Space | > 90% | Clean old logs, increase storage |
| Memory Usage | > 85% | Increase server size |

**Implementation**:
```typescript
// Middleware to track response times
export function trackResponseTime(handler) {
  return async (request) => {
    const start = Date.now();
    const response = await handler(request);
    const duration = Date.now() - start;
    
    if (duration > 5000) {
      console.warn(`Slow response: ${request.url} took ${duration}ms`);
    }
    return response;
  };
}
```

---

## 11. Future Enhancements & Roadmap

### 11.1 Short-term (1-2 months)

- [ ] Rate limiting on API endpoints (prevent abuse)
- [ ] Zod schema validation for all inputs
- [ ] Structured logging with centralized aggregation
- [ ] Email digest notifications (weekly updates)
- [ ] Mobile app (React Native or Flutter)
- [ ] Dark mode refinements (theme switching)
- [ ] Two-factor authentication (2FA) support

### 11.2 Medium-term (3-6 months)

- [ ] Analytics dashboard for coordinators
- [ ] AI-powered project recommendations (suggest supervisors)
- [ ] Collaborative document editing (Google Docs integration)
- [ ] Video meeting integration (Zoom/Google Meet API)
- [ ] Project timeline/Gantt chart visualization
- [ ] Group performance scoring algorithm
- [ ] Automated plagiarism detection (Turnitin API)
- [ ] Payment integration (for resource requests)

### 11.3 Long-term (6-12 months)

- [ ] Microservices refactoring (separate evaluations service)
- [ ] Multi-campus federation (unified experience across universities)
- [ ] Machine learning for project matching (students ↔ supervisors)
- [ ] Export to PDF (project proposals, evaluation reports)
- [ ] Mobile-first redesign
- [ ] Internationalization (support multiple languages)
- [ ] Accessibility improvements (WCAG 2.1 AA compliance)
- [ ] Custom branding per campus

---

## 12. Conclusion

**Projectify** is a well-architected, scalable Final Year Project management platform leveraging modern web technologies. The monolithic design is appropriate for current scale, with clear pathways to horizontal scaling via Redis adapters and load balancing. Strong emphasis on real-time collaboration (WebSockets), AI-powered features (Cohere + Pinecone), and data integrity (PostgreSQL + Prisma) make it a robust solution for academic FYP coordination.

**Key Strengths**:
1. Comprehensive data model supporting complex FYP workflows
2. Real-time chat and notifications for collaboration
3. AI-powered project uniqueness and feasibility analysis
4. Multi-role support with granular permission control
5. Scalable architecture ready for growth

**Areas for Improvement**:
1. Input validation (Zod schemas)
2. Rate limiting (prevent API abuse)
3. Comprehensive logging and monitoring
4. Email digest notifications
5. Mobile responsiveness

**Recommended Next Steps**:
1. Add comprehensive error handling and logging
2. Implement rate limiting on API endpoints
3. Set up monitoring and alerting on Railway
4. Plan microservices refactoring for independent scaling
5. Gather user feedback and iterate on UX

---

## Appendix: API Reference Quick Guide

### Authentication
```
POST /api/auth/signin                    # Login
POST /api/auth/signout                   # Logout
POST /api/auth/reset-password            # Send reset email
PATCH /api/auth/update-password          # Update password
```

### Students
```
GET  /api/student/profile                # Fetch profile
PATCH /api/student/profile               # Update profile
GET  /api/student/browse-peers           # Search peers
GET  /api/student/browse-supervisors     # Find supervisors
GET  /api/student/invitations            # List invitations
POST /api/student/invitations            # Send invitation
PATCH /api/student/invitations/:id       # Accept/Reject
```

### Supervisors
```
GET  /api/supervisor/profile             # Fetch profile
PATCH /api/supervisor/profile            # Update profile
GET  /api/supervisor/groups              # List groups
GET  /api/supervisor/requests            # Pending requests
PATCH /api/supervisor/requests/:id       # Accept/Reject
POST /api/supervisor/meetings            # Schedule meeting
```

### Groups
```
POST /api/groups/create                  # Create group
GET  /api/groups/:id                     # Fetch group
PATCH /api/groups/:id                    # Update group
DELETE /api/groups/:id                   # Delete group
GET  /api/groups/:id/invitations         # Group invitations
POST /api/groups/:id/invite-supervisor   # Invite supervisor
```

### Projects
```
POST /api/projects/create                # Create project
GET  /api/projects/:id                   # Fetch project
PATCH /api/projects/:id                  # Update project
DELETE /api/projects/:id                 # Delete project
POST /api/projects/:id/check-similarity  # Check uniqueness
GET  /api/projects/search                # Search projects
```

### Chat
```
GET  /api/chat/conversations             # List conversations
POST /api/chat/conversations             # Create conversation
GET  /api/chat/conversations/:id/messages # Fetch messages
# Messages via Socket.IO: 'chat:send'
```

### Evaluations
```
POST /api/evaluations/create             # Create evaluation
GET  /api/evaluations                    # List evaluations
POST /api/evaluations/:id/submit         # Submit response
PATCH /api/evaluations/:id/grade         # Grade submission
```

### Notifications
```
GET  /api/notifications                  # List notifications
PATCH /api/notifications/:id/read        # Mark as read
PATCH /api/notifications/read-all        # Mark all as read
```

---

**Document Generated**: March 18, 2026  
**System Version**: 0.1.0  
**Last Updated**: 2024  
**Architecture Type**: Monolithic Full-Stack Web Application  
**Primary Language**: TypeScript + React + Node.js
