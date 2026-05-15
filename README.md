# Projectify 🚀

Projectify is a comprehensive, centralized Final Year Project (FYP) Management Platform designed for multi-campus university environments. It acts as the backbone for the entire FYP lifecycle, moving students from project proposals and team formation to supervisor mentorship, hardware resource management, scheduling, and multi-round panel evaluations.

By leveraging an integrated **AI-powered pipeline**, Projectify proactively blocks duplicate project ideas from past years and evaluates the feasibility of new ideas to ensure projects can be completed successfully within an academic semester.

## 🌟 Key Features

* **AI-Backed Plagiarism & Feasibility Checker**: Automatically extracts details from project proposal documents (PDF/DOCX) using Cohere AI, verifies feasibility within a 4-month timeline, and performs a semantic similarity search via Pinecone Vector DB to prevent duplicate projects.
* **Real-time Team Chat & Notifications**: Integrated WebSockets (Socket.IO + Redis) enable 1-on-1 and Group chats with read receipts, typing indicators, file sharing, and real-time notification events.
* **Multi-Stage Evaluation Panel System**: Organize formal "Panel Checkpoints" (e.g., Mid-term Defense, Final Defense). Assign timeframes, venues, chair supervisors, and examiners to provide comprehensive scoring.
* **Structured Submissions**: Supervisors and coordinators can upload assignments/evaluations and set due dates. Student groups can submit their work for dual grading (Supervisor score vs. Generic Panel score).
* **Hardware/Software Resource Requests**: Hierarchical flow for requesting resources: `Group -> Requests hardware -> Supervisor adds notes/approves -> Coordinator approves`.
* **Background Meeting Scheduler**: Automatically scheduled CRON polling system that schedules meetings and proactively sends email reminders to all group members 24 hours and 1 hour before their scheduled time.
* **Industrial Projects Portal**: Faculty can upload pre-defined "Industrial Projects" allowing student groups lacking initial ideas to pick them up and request supervision.

## 🛠️ Technology Stack

### Frontend (UI/UX)
* **Framework**: Next.js 14.2 (App Router) built on React 18
* **Styling**: Tailwind CSS 3.4
* **UI Components**: Radix UI primitives & shadcn/ui
* **Visuals & Animations**: Framer Motion, Recharts (Data dashboards), Three.js (`@react-three/fiber`), tsparticles

### Backend (API & Logic)
* **Runtime**: Node.js with Next.js Serverless API Routes
* **Database**: PostgreSQL
* **ORM**: Prisma (v5.14)
* **Authentication**: NextAuth v5 (Credential provider with JWT sessions) + bcryptjs
* **Real-Time Layer**: WebSockets via Socket.IO utilizing `ioredis` for cross-server message broadcasting

### Cloud Integrations & Extended Services
* **AI & LLM**: Cohere AI
* **Vector Database**: Pinecone
* **File Storage**: Cloudflare R2 (S3-Compatible Object Storage)
* **Communications**: Brevo API / Resend / Nodemailer (Transactional Emails)
* **Document Parsers**: `pdf-parse`, `mammoth` (DOCX), `sharp` (Images)

## 🎭 Roles & Responsibilities

1. **🧑‍🎓 Students**: Propose custom projects by uploading specs, form groups (max 3), manage tasks, chat with peers/supervisors, submit evaluations, request resources, and review scores.
2. **👨‍🏫 Supervisors**: Mentor groups, accept/reject group requests, publish industrial projects, schedule meetings, grade assignments, and participate in evaluation panels.
3. **👔 Coordinators**: Configure campus guidelines, manage industrial project pools, resolve resource requests, setup Evaluation Panels, and assign supervisors.
4. **🛡️ Administrators**: Maintain overall system configuration, add overarching campuses, and handle access control globally.

## 🧠 Deep-Dive: AI Pipeline

The AI functionality is deeply woven into the platform to maintain high project quality:
1. **Document Upload**: Raw text is parsed from student proposals using `pdf-parse` or `mammoth` while files are uploaded to Cloudflare R2.
2. **Information Extraction**: The parsed text is sent to the `command-r7b-12-2024` Cohere model to extract Title, abstract, tech stack, and skills in strict JSON.
3. **Feasibility Validation**: Cohere grades the timeline, capabilities vs. requirements, and returns a Risk Report suggesting scope alterations.
4. **Vector Embedding**: Generates a 1024-dimensional semantic embedding via Cohere and upserts it into Pinecone's `project-embeddings` index.
5. **Similarity Check**: Uses a Cosine Similarity Search (`>50%` similarity threshold). If flagged, the LLM reads previous matches and generates a "Human-Readable Explanation" as to why the project is a duplicate.

## 🚀 Setup & Installation

### 1. Prerequisites
Ensure you have the following installed:
* [Node.js](https://nodejs.org/) (v18 or higher)
* [npm](https://www.npmjs.com/) or yarn
* [PostgreSQL](https://www.postgresql.org/) database setup
* Access to third-party services: Pinecone, Cohere AI, Cloudflare R2, and Brevo API

### 2. Clone the Repository
```bash
git clone <repository_url>
cd Projectify
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Setup Environment Variables
Create a `.env` file in the root directory by copying the `.env.example`:
```bash
cp .env.example .env
```
Open the `.env` file and configure it with your specific credentials. Below is the list of required environment variables:

**Database:**
* `DATABASE_URL`: Your PostgreSQL database connection string.

**Authentication & Security:**
* `NEXTAUTH_SECRET`: A secure secret string used to encrypt NextAuth session tokens.
* `NEXTAUTH_URL`: Base URL of the application in development (e.g., `http://localhost:3000`).
* `NEXT_PUBLIC_APP_URL`: Public app URL.
* `MESSAGE_ENCRYPTION_KEY`: A 32-character secret key used to encrypt real-time chat messages.

**Cloudflare R2 (File Storage):**
* `R2_ACCOUNT_ID`: Your Cloudflare account ID.
* `R2_BUCKET_NAME`: The name of your R2 storage bucket.
* `R2_API_TOKEN`: Your Cloudflare R2 Access Token.
* `R2_PUBLIC_URL`: Your R2 public/custom domain URL for serving assets.

**AI & Vector Database:**
* `cohere_api_key`: Your Cohere AI API key for intelligence routing and checks.
* `COHERE_MODEL`: The Cohere model to use (defaults to `command-r-08-2024`).
* `PINECONE_API_KEY`: Your Pinecone Vector DB API Key.
* `PINECONE_INDEX_NAME`: The target Pinecone index name (typically `project-embeddings`).

**Real-time WebSockets:**
* `NEXT_PUBLIC_SOCKET_URL`: (Optional) Explicit URL to target the WebSocket, otherwise defaults to local context.
* `REDIS_URL`: (Optional) Redis connection URL for tracking user sessions and scaling `Socket.IO` across processes horizontally.

**Email Notifications (Brevo):**
* `BREVO_API_KEY`: Your HTTP API Key from Brevo to send emails without SMTP locks.
* `BREVO_SENDER_EMAIL`: The verified sender email you configured in Brevo.
* `APP_URL`: Fully qualified production URL used in dynamic email links.

### 5. Initialize the Database
Configure the schema and apply migrations using Prisma:
```bash
npm run db:push
npm run db:generate
```

### 6. Run the Application
Start the development server:
```bash
npm run dev
# or for turbopack
npm run dev:turbo
```

The app will be running at [http://localhost:3000](http://localhost:3000).

---

*This platform was designed as an end-to-end Final Year Project solution incorporating modern AI solutions and real-time operations.*

<div align="center">
  <br />
  <strong>Made with ❤️ by</strong><br><br>
  <a href="https://github.com/Hanzlase">Muhammad Hanzla</a> &nbsp;&bull;&nbsp; 
  <a href="https://github.com/AhmadR-11">Ahmad Raza</a> &nbsp;&bull;&nbsp; 
  <a href="https://github.com/ramday">Saad ullaha</a>
</div>
