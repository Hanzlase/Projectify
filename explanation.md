# Projectify — Detailed Project Explanation (End‑to‑End)

This document is a **single, end‑to‑end, viva‑defensible explanation** of the Projectify system.

It complements the 5 module docs:
- `docs/Common.md`
- `docs/Students.md`
- `docs/Supervisors.md`
- `docs/Coordinators.md`
- `docs/Admin.md`

and explains the **full system architecture**, **all major features**, and **how each feature is implemented** (backend routes, data model, and cross‑cutting infrastructure like auth, storage, sockets, email, and AI/RAG).

---

## 1) What Projectify Is

Projectify is a role‑based Final Year Project (FYP) management platform for universities with multiple campuses. It supports:

- **Admin** (global governance): manages campuses and coordinators.
- **Coordinator** (campus governance): manages students/supervisors, evaluations, panels, industrial projects, notifications, and campus workflows.
- **Supervisor** (academic supervision): supervises groups, reviews requests, participates in evaluation panels, scores submissions, communicates via chat.
- **Student** (execution): forms groups, chooses projects, requests permissions, submits evaluations, requests resources, and communicates.

Core design goals:
- Strict **RBAC + campus scoping** for security.
- Clear, auditable workflows (statuses, lifecycle constraints).
- High usability via **notifications + realtime events**.
- AI assistance via **Similarity/Feasibility** (RAG + embeddings + vector retrieval).

---

## 2) Tech Stack & Runtime Architecture

### 2.1 Frontend
- **Next.js (App Router)** under `app/`
- UI pages per role:
  - `app/student/*`, `app/supervisor/*`, `app/coordinator/*`, `app/admin/*`
- Tailwind CSS via `tailwind.config.ts`, `app/globals.css`

### 2.2 Backend
Two backend layers coexist:

1. **Next.js Route Handlers** under `app/api/**/route.ts`
   - The primary API surface.
   - Total implemented: **146** route files (documented in `docs/Common.md` “Complete API Surface”).

2. **Custom Node server** (`server.js`)
   - Hosts the Next.js app and also mounts **Socket.IO**.
   - Socket endpoint path: `/api/socketio`.
   - Socket transports configured: `['websocket', 'polling']`.
   - Rooms created by `server.js` (joined on `user:auth`):
     - `user:<userId>` (private one-user events)
     - `campus:<campusId>` (campus broadcast)
     - `role:<role>:<campusId>` (role-scoped broadcast)

> Note: WebSocket runs over TCP; **polling is still HTTP** (also over TCP). Implementation-wise, Socket.IO is configured to prefer WebSocket with HTTP long‑polling fallback.

### 2.3 Database
- **PostgreSQL** accessed via **Prisma ORM**
- Prisma schema: `prisma/schema.prisma`

Concrete implementation detail:
- Role scoping is modeled explicitly in Prisma:
  - `Student.campusId`, `FYPSupervisor.campusId`, `FYPCoordinator.campusId`
- Most route handlers do: `auth()` → role/campus checks → Prisma query/update.

### 2.4 Storage
- **Cloudflare R2** used for file storage.
- R2 helper utilities in `lib/r2.ts`.

### 2.5 Email
- Emails (reset password, meeting notifications/reminders) via `lib/email.ts`.
- Meeting reminder scheduling via `lib/meeting-scheduler.ts` and `lib/meeting-scheduler-runner.js`.

### 2.6 AI / Similarity / RAG
- Cohere client + helpers in `lib/cohere.ts`.
- Vector search via Pinecone in `lib/pinecone.ts`.

Implementation notes from code:
- `lib/cohere.ts` implements:
  - request queue (`MAX_CONCURRENT_REQUESTS = 5`) to avoid rate limit spikes
  - in-memory embedding cache (TTL)
  - embeddings via `embed-english-v3.0`
- `lib/pinecone.ts`:
  - namespace `projects`
  - vector IDs `project-<id>`
  - retries + index health-check caching

---

## 3) Security Model: Authentication, Sessions, RBAC

### 3.1 Authentication
- Implemented via **NextAuth** in `lib/auth.ts`.

How it is implemented:
- Credentials login supports **email OR roll number** using a single Prisma query with `OR`.
- Passwords are verified with `bcrypt.compare` against `User.passwordHash`.
- Session/JWT callbacks attach: `id`, `role`, `status`, `campusId` onto the token/session.

### 3.2 Password handling
- Passwords are stored as hashes (bcrypt).
- Login compares plaintext input with hash.
- Reset password flow sets a new hash.

### 3.3 Role‑based access control (RBAC)
- Roles: `admin`, `coordinator`, `supervisor`, `student`
- Every sensitive route checks `session.user.role`.

### 3.4 Status enforcement
- Users can be `active`, `pending`, `suspended`, `removed` (naming based on code/docs).
- Middleware (`middleware.ts`) redirects suspended users to suspended pages.

---

## 4) Data Model (High‑Level)

The exact schema is in `prisma/schema.prisma`. Major entities include:

- `User`: common identity for all roles (name, email, passwordHash, role, status, profileImage)
- `Campus`: campus scoping boundary
- Role profiles:
  - `Student`
  - `FYPSupervisor`
  - `FYPCoordinator`
  - `Admin` (if modeled)
- Collaboration:
  - `Group`, `GroupInvitation`
- Projects:
  - `Project`, and permission request records
- Communication:
  - `Conversation`, `ConversationParticipant`, `Message`, `ConversationPin`
- Notifications:
  - `Notification`, `NotificationRecipient`, and possibly reply/threads
- Evaluations:
  - `Evaluation`, `EvaluationSubmission`, `Panel`, `PanelMember`, `GroupAssignment`, etc.
- Resource Requests:
  - request records with approval/status transitions
- Meetings:
  - `Meeting` plus reminder bookkeeping (if modeled)

---

## 5) Core Features & How They Are Implemented

This section is organized by system feature (not by role), covering **what** it does and **how** it works in code.

### 5.1 Profiles & Avatars
**What:** Users view and update their profile details; can upload a profile image.

**How:**
- `GET /api/profile` returns role‑aware profile.
- `PUT /api/profile/update` updates allowed fields.
- `POST/PUT /api/profile/image` uploads avatar and stores URL in `User.profileImage`.

### 5.2 Notifications System
**What:** Coordinators broadcast notifications; users view, mark read, reply, and manage recipient rows.

**How:**
- `POST /api/notifications` coordinator‑only; creates `Notification` and bulk creates `NotificationRecipient` scoped to campus and target type.
- `GET /api/notifications` lists notifications for current user via recipient join.
- `POST /api/notifications/mark-all-read` marks all read.
- Subroutes `/api/notifications/[id]` and `/api/notifications/[id]/reply` manage per‑recipient state and replies.

Realtime:
- Many workflows also emit Socket.IO events (see sockets section).

### 5.3 Chat / Messaging
**What:** Direct messages and group conversations, with file attachments and pinning.

**How:**
- `GET/POST /api/chat` list conversations / create or resolve.
- `GET/POST /api/chat/[conversationId]` list messages / send message.
- `DELETE /api/chat/[conversationId]/message/[messageId]` deletes a message.
- `POST /api/chat/upload` uploads attachments to R2 with MIME allow list and 10MB limit.
- Pinning via `/api/chat/pin`:
  - `GET` returns pinned conversation IDs.
  - `POST` idempotently creates pin.
  - `DELETE` idempotently removes pin.

### 5.4 Groups & Invitations
**What:** Students form groups; invite students and supervisors; coordinator observes campus operations.

**How:**
- `/api/groups` and `/api/groups/[groupId]` provide CRUD / discovery.
- `GroupInvitation` is used to invite supervisors/students with unique constraints.
- `Group.isFull` and student group membership (`Student.groupId`) enforce membership constraints.

### 5.5 Group Tasks
**What:** Group taskboard with tasks and subtasks.

**How:** Implemented in `/api/groups/[groupId]/tasks`:
- GET loads tasks, enriches with assignee/creator data, organizes into main tasks + subtasks, sorted by status/priority/time.
- POST creates tasks with optional `parentId` for subtasks.
- PATCH updates fields and manages `completedAt` depending on status.
- DELETE enforces role restrictions: students cannot delete supervisor‑created tasks.

### 5.6 Group Meetings + Email Reminders
**What:** Schedule meetings; notify all participants; send reminders (24h and 1h).

**How:** Implemented in `/api/groups/[groupId]/meetings`:
- POST creates meeting, builds participant email list (students + supervisor), sends "created" email, schedules reminders.
- PATCH reschedules reminders if time changes.
- DELETE cancels meeting and reminders.
- Background processing trigger: `POST /api/meetings/process-reminders`.

### 5.7 Projects (CRUD + Upload)
**What:** Students/supervisors create projects, upload docs/thumbnails, manage project records.

**How:**
- `/api/projects` list/create.
- `/api/projects/upload` handles file upload (R2) and stores document/thumbnail URLs.
- `/api/projects/[id]` per‑project read/update/delete.

### 5.8 Project Permission Workflow
**What:** Students request permission to use a supervisor’s project; supervisor approves/rejects; notifications and sockets inform users.

**How:** `/api/projects/[id]/permission`:
- POST (student‑only) creates a permission request with status `pending` with duplicate checks.
- PUT (owner‑only) updates status to `approved` or `rejected`.
- Both sides generate notifications and emit socket events.

### 5.9 AI Similarity Checking (RAG + Embeddings + Vector Search)
**What:** Analyze a PDF/DOCX proposal and detect similarity to existing projects; provide explanations and differentiation suggestions.

**How (from `app/api/projects/check-similarity/route.ts`):**
1. Accepts `multipart/form-data` with a `file`.
2. Validates MIME type as PDF or DOCX.
3. Extracts and cleans text via `lib/document-parser.ts`.
4. Calls `extractProjectInfo()` (Cohere) to extract structured fields.
5. Builds embedding input emphasizing **features/modules/workflows** via `generateFeatureBasedEmbeddingText(...)`.
6. Runs `generateEmbedding(...)` and `generateFeasibilityReport(...)` in parallel (`Promise.all`).
7. Queries Pinecone with `searchSimilarProjects(embedding, 3)`.
8. Applies uniqueness threshold using `checkUniqueness(similarProjects, 0.5)`.
9. If matches exist, runs post-analysis generation in parallel:
   - `generateSimilarityExplanation(...)`
   - `generateSimilarityReason(...)` per match
   - `generateDifferentiationSuggestions(...)`

Why this qualifies as RAG here:
- **Retrieval**: Pinecone returns nearest-neighbor projects (retrieved context).
- **Generation**: Cohere generates explanation/reasons/suggestions conditioned on the retrieved projects.

### 5.10 AI Feasibility
**What:** Generate feasibility assessment for a project.

**How:** `/api/projects/[id]/feasibility` uses Cohere to generate feasibility report with access checks and caching.

### 5.11 Evaluations (Campus Tasks)
**What:** Coordinators create evaluation tasks; groups submit; supervisors/panels score; coordinator aggregates.

**How:**
- Coordinator CRUD: `/api/coordinator/evaluations`
- Student submissions: `/api/student/evaluations`
- Supervisor scoring: `/api/supervisor/evaluations/score-submission`
- Coordinator analytics: `/api/coordinator/evaluation-scores`

### 5.12 Evaluation Panels
**What:** Coordinators assemble panels; assign groups; supervisors participate; AI can suggest panel composition.

**How:**
- `/api/coordinator/evaluation-panels` manages panels and assignments.
- `/api/coordinator/evaluation-panels/[panelId]/members` manages membership.
- `/api/coordinator/evaluation-panels/ai-suggest` uses Cohere to suggest panel composition using campus context.

### 5.13 Resource Requests
**What:** Students request resources; supervisors review; coordinators schedule meetings and approve/reject.

**How:**
- Student CRUD: `/api/student/resource-requests`
- Supervisor review: `/api/supervisor/resource-requests`
- Coordinator workflow: `/api/coordinator/resource-requests`

### 5.14 Industrial Projects
**What:** Coordinators publish industrial projects; students/supervisors can request; assignment workflow.

**How:**
- `/api/coordinator/industrial-projects` list/create and campus‑scoped filtering.
- `/api/coordinator/industrial-projects/upload` uploads assets.
- `/api/coordinator/industrial-projects/[id]` per record operations.
- `/api/coordinator/industrial-projects/[id]/request` request/assign flow.

### 5.15 Admin Governance
**What:** Admin manages campuses and coordinators.

**How:**
- `/api/admin/dashboard` global KPIs.
- `/api/admin/campuses` campus CRUD with deletion constraints.
- `/api/admin/coordinators` coordinator creation and lifecycle operations.
- `/api/admin/profile` admin profile update with password change verification.

### 5.16 System Support
**What:** Health check, helpdesk submission, and page-data loader.

**How:**
- `/api/health`
- `/api/help/submit-issue`
- `/api/page-data`

---

## 6) Realtime (Socket.IO)

### What
Realtime updates for:
- Permission requests/decisions
- New notifications
- Chat message delivery
- (Potential) task/meeting updates depending on frontend usage

### How
- Socket server runs in `server.js` with path `/api/socketio`.
- API routes emit events through helpers in `lib/socket-emitters.ts` (e.g., `emitChatMessage`, `emitNotificationToUser`, `emitPermissionResponse`).

---

## 7) Error Handling Conventions

API routes generally follow:
- `200/201` success responses
- `400` validation failures
- `401` unauthenticated
- `403` forbidden / wrong role
- `404` missing resources
- `500` unexpected exceptions

---

## 8) Performance Patterns

- Many dashboard endpoints use `Promise.all` for parallel aggregation.
- Prisma `_count` and selective `select` reduce payload size.
- Pagination is used for lists where applicable.

---

## 9) Where to Find Everything (Repository Map)

- UI routes: `app/<role>/*`
- API routes: `app/api/**/route.ts`
- Prisma schema: `prisma/schema.prisma`
- Auth: `lib/auth.ts`, `lib/auth.config.ts`
- Storage: `lib/r2.ts`
- Email: `lib/email.ts`
- Meeting scheduling: `lib/meeting-scheduler.ts`, `lib/meetings/*`, `/api/meetings/process-reminders`
- AI/RAG: `lib/cohere.ts`, `lib/pinecone.ts`, `lib/document-parser.ts`
- Sockets: `server.js`, `lib/socket.ts`, `lib/socket-emitters.ts`

---

## 10) Verification Checklist ("Nothing is missed")

To confirm completeness:
1. Compare `docs/Common.md` "Complete API Surface" list to `app/api/**/route.ts` list.
2. For each route:
   - Ensure endpoint is mentioned in exactly one of the 5 module docs.
   - Ensure each has: purpose, auth rules, request format, validations, response format, side effects.
3. Confirm cross‑cutting infrastructure is covered:
   - Auth/session
   - RBAC + status enforcement
   - Storage constraints
   - Sockets
   - Email
   - AI (RAG)

---

## Appendix A — API Surface Summary

The authoritative route index is maintained in `docs/Common.md` under:
- **Complete API Surface (Source of Truth)**

It lists every implemented route and its owner doc.
