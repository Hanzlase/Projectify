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
9. [Evaluations (Coordinator Tasks + Panel Assignments)](#evaluations-coordinator-tasks--panel-assignments)
10. [Resource Requests](#resource-requests)
11. [Profile Management](#profile-management)
12. [API Routes & Endpoints](#api-routes--endpoints)
13. [Database Models](#database-models)
14. [Permissions & Access Control](#permissions--access-control)
15. [Performance Optimizations](#performance-optimizations)

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
8. **Evaluations**: View coordinator-created evaluations, submit group work, and view panel assignments/comments
9. **Resource Requests**: Submit and track hardware/software/resource needs for the group

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

### Dashboard API (Implemented)

The student dashboard is backed by two API endpoints:

- `GET /api/student/dashboard` (high-level snapshot: campus, group, stats, supervisors, fellow students)
- `GET /api/student/dashboard/tasks-meetings` (group-scoped tasks + meetings widgets)

#### `GET /api/student/dashboard`

**Authentication**
- Requires a valid session (`auth()`), otherwise `401 Not authenticated`.

**Core queries and response composition** (as implemented)
- Loads the `Student` record by `userId` and includes:
  - `campus`
  - `group` → `students` → `user` (selected fields)
- Runs multiple campus-scope queries concurrently:
  - Supervisors on campus (`fYPSupervisor.findMany`)
  - Fellow students on campus excluding caller (`student.findMany`, `take: 50`)
  - Counts: supervisors, students, pending invitations (student-to-student), total projects

**Edge cases**
- `404 Student not found` if the authenticated user has no `Student` row.
- Group details become `null` if the student is not assigned to any group.

**Derived fields (server-computed)**
- `supervisors[].available` is computed as `totalGroups < maxGroups`.
- `fellowStudents[].hasGroup` is computed as `!!groupId`.

#### `GET /api/student/dashboard/tasks-meetings`

Purpose: populate dashboard widgets with the most relevant tasks/meetings for the student’s group.

**Authentication & preconditions**
- Requires session; otherwise `401 Not authenticated`.
- Loads the student with `group`.
- If `groupId` is null: returns `{ tasks: [], meetings: [], upcomingMeetings: [] }` (not an error).

**Task retrieval rules**
- Reads from `projectTask` with constraints:
  - `groupId = student.groupId`
  - `parentId = null` (main tasks only; subtasks excluded)
  - Sorting: `dueDate asc`, then `priority desc`, then `createdAt desc`
  - `take: 10`
- For each task, the API fetches assignee info (if `assignedTo` is set) and computes `isAssignedToMe`.

**Meeting retrieval rules**
- Reads all `meeting` rows for the group (ordered by `scheduledAt asc`).
- Attaches creator (`createdById`) user info.
- Computes `upcomingMeetings` as:
  - `status === 'scheduled'`
  - `scheduledAt >= startOfToday`
  - returns first 3 entries.

**Sorting behavior**
- The response sorts tasks to show:
  1) tasks assigned to the current user first
  2) then by status order: `pending` → `in_progress` → `completed`
  3) then by due date

---

## Evaluations (Coordinator Tasks + Panel Assignments)

Student evaluations cover two related concepts implemented in the backend:

1. **Coordinator-created Evaluations** (campus-wide evaluation “tasks” with due dates and attachments).
2. **Evaluation Panels** (a panel is assigned to a group; students see panel metadata and can fetch panel comments).

### Student evaluation feed

#### `GET /api/student/evaluations`

**Auth**
- Requires role `student`, else `401 Unauthorized`.

**What it returns**
- `evaluations[]`: all evaluations on the student’s campus with status in `{ active, closed, graded }`.
- `submission`: included per evaluation only if the student is in a group; server includes the group’s submission (if any) with attachments.
- `panels[]`: panel assignments for the student’s group (if any), including panel members.
- `hasGroup`, `groupId` flags.

**Important computed fields**
- `isOverdue` is `true` when `now > dueDate` AND there is no submission.

**Edge cases**
- Student without a group still receives the `evaluations[]` list but with no `submissions` joined.
- If a group has no panel assignment for any panel, `panels: []`.

### Submitting evaluation work

#### `POST /api/student/evaluations`

**Request body**
- `evaluationId` (required)
- `content` (optional)
- `attachments` (optional array; metadata only)

**Preconditions and validation**
- Student must be in a group, else `400 You must be in a group to submit`.
- Evaluation must exist, else `404 Evaluation not found`.
- Evaluation must not be `closed` or `graded`, else `400 This evaluation is closed for submissions`.
- Only one submission per evaluation per group:
  - enforced via `evaluationId_groupId` lookup; if exists → `400 Your group has already submitted`.

**Submission status**
- If `now > dueDate`, server marks submission `status: 'late'`, else `status: 'submitted'`.

**Attachments**
- This endpoint stores attachment metadata (`fileName`, `fileUrl`, optional `fileSize`, `fileType`).
- Uploading the actual file is handled separately (commonly via `POST /api/chat/upload`, see file constraints below).

#### `PATCH /api/student/evaluations`

**Purpose**: update an existing submission before grading.

**Request body**
- `submissionId` (required)
- `content` (optional)
- `attachments` (optional; added as new rows)

**Rules/constraints**
- Submission must belong to the student’s group, otherwise `404 Submission not found`.
- If `existingSubmission.status === 'graded'` → `400 Cannot edit graded submission`.
- New attachments are appended via `submissionAttachment.createMany` (the implementation does not delete/replace old attachments).

#### `DELETE /api/student/evaluations?submissionId=...`

**Purpose**: withdraw/unsubmit before grading.

**Rules/constraints**
- Submission must belong to the student’s group.
- If graded → `400 Cannot withdraw a graded submission`.
- If *scored* (either `supervisorScore` or `panelScore` is not null) → `400 Cannot withdraw a scored submission`.
- Deletes submission attachments first, then the submission.

### Panel comments

#### `GET /api/student/evaluations/panel-comments?panelId=...`

**Purpose**: fetch chronological feedback/comments left by panel members for the student’s group.

**Validation / access rules**
- Requires role `student`.
- `panelId` query param is required; else `400 panelId is required`.
- If student has no group → returns `{ comments: [] }`.
- If the student’s group is not assigned to the panel (`groupPanelAssignment` not found) → returns `{ comments: [] }`.

**Returned fields**
- Each comment includes `userName` and `userImage` via a server-side join to `User`.

---

## Resource Requests

Resource Requests allow groups to request resources and have them reviewed by supervisor/coordinator.

#### `GET /api/student/resource-requests`

**Auth & preconditions**
- Requires role `student`.
- Student must belong to a group, else `400 You must be in a group`.

**Behavior**
- Fetches all `resourceRequest` rows for `groupId` ordered by newest first.
- Enriches response with:
  - `createdBy` name (from `User`)
  - `supervisorName` if `supervisorId` is set
  - `items` parsed from JSON (`JSON.parse(r.items || "[]")`)

**Edge cases**
- If `items` stored in DB is invalid JSON, parsing would throw and the API returns `500` (implementation does not guard this).

#### `POST /api/student/resource-requests`

**Request body**
- `title` (required)
- `items` (required; must be a non-empty array)
- `description` (optional)
- `resourceType` (optional; default: `hardware`)
- `justification` (optional)

**Rules/constraints**
- Student must be in a group.
- Creates request with `status: 'pending'`.
- Stores `items` as JSON string.

#### `PATCH /api/student/resource-requests`

**Request body**
- `requestId` (required)
- updatable fields: `title`, `description`, `resourceType`, `items`, `justification`

**Rules/constraints**
- Only editable while `status === 'pending'`, else `400 Can only edit pending requests`.
- Request must belong to the student’s group, else `404 Request not found`.

#### `DELETE /api/student/resource-requests?id=...`

**Rules/constraints**
- Only deletable while `status === 'pending'`.
- Request must belong to the student’s group.

---

## API Routes & Endpoints

This section lists key student-facing endpoints in this module. Cross-cutting endpoints (auth/profile/chat/notifications/groups/projects) are described in `docs/Common.md`.

### Student-scoped endpoints (`/api/student/*`)

| Method | Endpoint | Purpose | Key constraints |
|---|---|---|---|
| GET | `/api/student/dashboard` | Dashboard snapshot: campus, group, stats, supervisors, fellow students | 401 if not authenticated; 404 if no Student |
| GET | `/api/student/dashboard/tasks-meetings` | Dashboard widgets: tasks and meetings | Returns empty arrays if no group |
| GET | `/api/student/group-id` | Lightweight groupId lookup | Returns `groupId: null` on failures |
| GET/POST/PATCH/DELETE | `/api/student/evaluations` | List evaluations; submit/update/withdraw group submissions | Must be in group for submit/update/withdraw; cannot edit/withdraw graded/scored |
| GET | `/api/student/evaluations/panel-comments` | Fetch panel comments (requires `panelId`) | Returns `comments: []` if no group or no assignment |
| GET/POST/PATCH/DELETE | `/api/student/resource-requests` | CRUD resource requests for the student’s group | Only pending requests can be edited/deleted |
| GET | `/api/student/search-users` | Search students/supervisors (campus-scoped) | Role/student auth required (see handler) |

### Upload constraints used by the Student module (chat attachments)

Student flows (chat messages, evaluation submissions, etc.) commonly upload files via:

- `POST /api/chat/upload` (multipart/form-data)

**Key implemented constraints**
- Requires authentication (`401 Not authenticated`).
- Requires R2 configured (`500 File storage is not configured`).
- Expects `formData` fields:
  - `file` (required)
  - `type` = `image` or `file`
- File size limit: **10 MB**.
- MIME allow-list:
  - Images: `image/jpeg`, `image/png`, `image/gif`, `image/webp`
  - Files: images plus `pdf`, MS Office formats, `txt`, `zip`, `rar`.
- Generates unique key: `chat-attachments/{userId}/{timestamp}-{randomHex}.{ext}`.

---

## Notifications (student view)

Student notification retrieval is provided by a common endpoint:

- `GET /api/notifications?limit=..&offset=..`
  - Limit is capped by server at `100`.
  - Includes `unreadCount` in response.

Student notification creation is **not** permitted (server enforces coordinator-only on `POST /api/notifications`).
