import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "./prisma"

// Production logger - only logs errors in production
const isProd = process.env.NODE_ENV === 'production';
const log = isProd ? () => {} : console.log;
const logError = console.error; // Always log errors

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        identifier: { label: "Email or Roll Number", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.identifier || !credentials?.password) {
          log("Missing credentials")
          return null
        }

        const identifier = credentials.identifier as string
        const password = credentials.password as string

        try {
          // Optimized: Single query that handles both email and roll number lookup
          // Uses OR condition to avoid separate queries
          const user = await (prisma.user as any).findFirst({
            where: {
              OR: [
                { email: identifier },
                { students: { roll_number: identifier } }
              ]
            },
            select: {
              user_id: true,
              email: true,
              name: true,
              password_hash: true,
              role: true,
              status: true,
              students: {
                select: { campus_id: true }
              },
              fyp_supervisors: {
                select: { campus_id: true }
              },
              fyp_coordinators: {
                select: { campus_id: true }
              },
            }
          })

          if (!user) {
            log("User not found:", identifier)
            return null
          }

          // Check if user is suspended or removed
          if (user.status === 'SUSPENDED') {
            log("User is suspended:", identifier)
            return {
              id: 'SUSPENDED',
              email: user.email,
              name: user.name,
              role: 'suspended',
              originalRole: user.role, // Preserve original role for proper redirect
              status: 'SUSPENDED',
              campusId: null,
            }
          }
          
          if (user.status === 'REMOVED') {
            log("User account has been removed:", identifier)
            return null
          }

          // Compare password with hashed password
          const isPasswordValid = await bcrypt.compare(password, user.password_hash)

          if (!isPasswordValid) {
            log("Invalid password for user:", identifier)
            return null
          }

          log("Login successful for:", user.email)

          // Admin doesn't have a campusId
          let campusId = null;
          if ((user.role as string) !== 'admin') {
            campusId = user.fyp_coordinators?.campus_id 
              ?? user.fyp_supervisors?.campus_id 
              ?? user.students?.campus_id 
              ?? null
          }

          // Return minimal user object for JWT
          return {
            id: user.user_id.toString(),
            email: user.email,
            name: user.name,
            role: user.role,
            status: user.status || 'ACTIVE',
            campusId: campusId?.toString() || null,
          }
        } catch (error) {
          logError("Auth error:", error)
          return null
        }
      }
    })
  ],
  callbacks: {
    // Add custom fields to JWT token
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.originalRole = (user as any).originalRole
        token.status = (user as any).status
        token.campusId = user.campusId
      }
      return token
    },
    // Add custom fields to session
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        ;(session.user as any).originalRole = token.originalRole
        session.user.status = token.status as string
        session.user.campusId = token.campusId as string | null
      }
      return session
    }
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET || "your-secret-key-change-in-production",
  trustHost: true,
  // Reduce JWT payload - skip unnecessary claims
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // Match session maxAge
  },
})
