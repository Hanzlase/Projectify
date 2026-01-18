# Authentication (Auth) Documentation

## Overview

This document explains the authentication system used across the Projectify application. It covers the architecture and flows for sign-up, sign-in, session management, role enforcement, password reset, and related security considerations. The project uses NextAuth.js for session management alongside custom routes for login/forgot-password and Prisma as the primary user store.

Key goals:
- Secure credential storage and verification
- Role-based access control (student / supervisor / coordinator / admin)
- Short-lived sessions with safe cookies
- Safe password reset and account activation flows
- Auditability and rate limiting for sensitive endpoints

---

## Main Components & Files

- NextAuth configuration: `app/api/auth/[...nextauth]/` (NextAuth route)
- Custom auth routes: `app/api/auth/login/`, `app/api/auth/forgot-password/`, `app/api/auth/forgot-password/*`
- Types: `types/next-auth.d.ts`
- Database model: `User` (see `prisma/schema.prisma`)
- Utilities: password hashing & verification, token generation, email helpers (SMTP/R2 or configured provider)
- Middleware: global role/session checks (middleware.ts)

Refer to these files when implementing or debugging auth behavior.

---

## Database Model (User) — important fields

Relevant `User` fields (representative):
- `userId` (Int) — primary key
- `email` (String, unique)
- `password` (String) — bcrypt hashed (nullable for OAuth-only accounts)
- `name` (String)
- `role` (Enum) — e.g. `student | supervisor | coordinator | admin`
- `status` (String) — `pending | active | suspended`
- `profileImage` (String?)
- `createdAt`, `updatedAt`
- Optional: `resetToken`, `resetTokenExpires` (or a dedicated PasswordReset table)

Security notes:
- Passwords MUST be stored hashed (bcrypt with cost >=10). Never store plaintext.
- `status` controls whether a user can log in (e.g., suspended or pending accounts are blocked).

---

## Authentication Flows

1. Sign-up / Account creation
   - Coordinator-created accounts: created by coordinator APIs (`/api/coordinator/add-students`, `/api/coordinator/add-supervisors`). These are created server-side and usually set `status = 'active'` by default.
   - Self-registration (if enabled): user submits details → server validates → creates `User` with `status = 'pending'` (optionally email verify) → sends verification email.

2. Sign-in (Email/Password)
   - Frontend posts credentials to NextAuth or custom login route (`/api/auth/login`).
   - Server finds user by email, verifies `status === 'active'` and password using bcrypt.compare.
   - On success, NextAuth creates a session (cookie) and returns session information.

3. OAuth / Provider logins (if configured)
   - NextAuth provider flow (e.g., Google) maps provider account to `User` record; create account if not found.
   - No password stored for OAuth-only accounts.

4. Session handling
   - NextAuth issues a secure cookie containing a session token (or JWT depending on `session.strategy`).
   - Session retrieval happens in server components via `auth()` helper calls or `getToken()` in middleware.

5. Password Reset / Forgot Password
   - User requests reset via `POST /api/auth/forgot-password` with email.
   - Server generates a one-time token (cryptographically secure, stored hashed in DB or via separate table) with expiry (e.g., 1 hour), sends email with token link.
   - Reset page calls `POST /api/auth/reset-password` with token + new password. Server validates token, expiry, updates hashed password, clears token, and optionally invalidates sessions.

---

## NextAuth Configuration (typical setup)

Important configuration points (check `app/api/auth/[...nextauth]`):
- `adapter`: Prisma adapter to map sessions and accounts to DB
- `secret`: `NEXTAUTH_SECRET` environment variable (must be set)
- `session.strategy`: `database` (token stored server-side) or `jwt` (stateless). `database` + Prisma is recommended for easy revocation.
- `callbacks`: customize `jwt` and `session` callbacks to include `userId`, `role`, `status` in session object.
- `events`: hook into `signIn`, `signOut`, `createUser` for audit logs and notification triggers.

Example callback behavior:
- On sign-in, check `status === 'active'`; reject if suspended.
- Populate session: { userId, email, name, role }

---

## Middleware & Route Protection

- `middleware.ts` runs for protected routes. It should:
  - Extract session via `getToken()` or a server-side `auth()` helper
  - Redirect unauthenticated users to `/login`
  - Redirect suspended users to `/suspended`
  - Enforce role-based access: e.g., `/coordinator/*` only accessible to `role === 'coordinator'`

Access pattern used across APIs:
- First, call `auth()` or `getToken()` to ensure authenticated
- Then, verify `session.user.role` equals required role
- Additionally, verify `session.user.status === 'active'`

---

## Password Hashing & Storage

- Use `bcrypt` (or `argon2` if available) for hashing.
- Cost factor: bcrypt salt rounds >= 10 (adjust for server CPU characteristics).
- When resetting or updating password, re-hash; do not reuse tokens or expose password in logs.

---

## Password Reset Implementation Notes

- Token generation: use `crypto.randomBytes(32).toString('hex')` and store a hashed version in DB (HMAC or bcrypt) with expiry timestamp.
- Validation: constant-time comparison against stored hash.
- Invalidation: delete token on use and invalidate all existing sessions for the user (session table or session versioning field).
- Rate limit the forgot-password endpoint to avoid abuse and enumeration (e.g., 5 requests per hour per IP/email).

---

## Email & Verification

- SMTP or third-party email API (SendGrid, SES). Environment variables required: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` (or provider-specific keys).
- For account verification and password reset, always send time-limited links and avoid including the raw token in logs.

---

## Edge Cases & Validations

- Block login if `status !== 'active'` with clear error messages.
- Prevent duplicate accounts (unique email constraint).
- Validate email format and password strength on signup and reset.
- Protect against username/email enumeration in responses: always return a generic message such as "If an account with that email exists, you will receive an email." for forgot-password requests.
- Expire tokens properly and handle replay attempts.

---

## Security Best Practices

- Use HTTPS in production and set cookie flags: `Secure`, `HttpOnly`, `SameSite=Strict` (or `Lax` for cross-site flows when necessary).
- Set `NEXTAUTH_SECRET` and keep it secret.
- Use database-backed sessions for easy revocation.
- Implement rate-limiting on login and forgot-password endpoints.
- Log auth events (successful/failed sign-ins, password resets, account changes) to an audit store.
- Use CSP, XSS protections and sanitize user-controlled inputs.

---

## Performance & Operational Considerations

- Cache session lookups for high-traffic endpoints where acceptable, but ensure cache invalidation on password changes or revoke operations.
- Use parallel queries for user-related dashboard data (as seen in coordinator/supervisor dashboards).
- Monitor auth-related metrics: failed login rate, reset requests, suspicious IPs.

---

## Environment Variables

- `NEXTAUTH_URL` - base URL for NextAuth
- `NEXTAUTH_SECRET` - secret for signing
- SMTP settings: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` or provider keys
- Optional: `SESSION_MAX_AGE`, `SESSION_UPDATE_AGE`

---

## API Endpoints (summary)

- `POST /api/auth/login` — custom login (email/password) endpoint
- `POST /api/auth/forgot-password` — request password reset
- `POST /api/auth/reset-password` — complete password reset (token + new password)
- NextAuth: `GET/POST /api/auth/[...nextauth]` — provider and session management
- Protected resource pattern: all `api/*` check `auth()` and role before processing

---

## Testing Checklist

- [ ] Verify signup flows for coordinator-created accounts and self-signup (if enabled)
- [ ] Test login with valid/invalid credentials
- [ ] Test suspended & pending users are blocked
- [ ] Test password reset end-to-end (request, receive email, reset, login)
- [ ] Ensure session revocation on password change
- [ ] Check cookies are Secure/HttpOnly in production
- [ ] Confirm rate-limiting works for auth endpoints

---

## Recommended Improvements

- Add audit table for auth events (sign-ins, resets, account changes).
- Use `argon2` for password hashing if supported by environment.
- Implement MFA (TOTP) for supervisor/coordinator roles.
- Use short-lived access + refresh token strategy if you need a stateless API for mobile clients.

---

If you want, I can also create a visual flow diagram or add a checklist specific to your panel presentation slides.
