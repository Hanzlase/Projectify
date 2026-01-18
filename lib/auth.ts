import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "./prisma"

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
          console.log("Missing credentials")
          return null
        }

        const identifier = credentials.identifier as string
        const password = credentials.password as string

        try {
          // Find user by email first
          let user = await prisma.user.findUnique({
            where: { email: identifier },
            include: {
              student: true,
              supervisor: true,
              coordinator: true,
            }
          })

          // If not found by email, try to find by roll number (for students)
          if (!user) {
            const student = await prisma.student.findUnique({
              where: { rollNumber: identifier },
              include: {
                user: {
                  include: {
                    student: true,
                    supervisor: true,
                    coordinator: true,
                  }
                }
              }
            })
            if (student) {
              user = student.user
            }
          }

          if (!user) {
            console.log("User not found:", identifier)
            return null
          }

          // Check if user is suspended or removed
          const userStatus = (user as any).status
          if (userStatus === 'SUSPENDED') {
            console.log("User is suspended:", identifier)
            // Return a special user object that indicates suspension
            return {
              id: 'SUSPENDED',
              email: user.email,
              name: user.name,
              role: 'suspended',
              status: 'SUSPENDED',
              campusId: null,
            }
          }
          
          if (userStatus === 'REMOVED') {
            console.log("User account has been removed:", identifier)
            return null
          }

          // Compare password with hashed password
          const isPasswordValid = await bcrypt.compare(password, user.passwordHash)

          if (!isPasswordValid) {
            console.log("Invalid password for user:", identifier)
            return null
          }

          console.log("Login successful for:", user.email)

          // Get campusId based on role
          let campusId: number | null = null
          if (user.coordinator) {
            campusId = user.coordinator.campusId
          } else if (user.supervisor) {
            campusId = user.supervisor.campusId
          } else if (user.student) {
            campusId = user.student.campusId
          }

          // Return user object (will be stored in JWT)
          return {
            id: user.userId.toString(),
            email: user.email,
            name: user.name,
            role: user.role,
            status: (user as any).status || 'ACTIVE',
            campusId: campusId?.toString() || null,
          }
        } catch (error) {
          console.error("Auth error:", error)
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
        session.user.status = token.status as string
        session.user.campusId = token.campusId as string | null
      }
      return session
    }
  },
  pages: {
    signIn: "/login", // Custom login page
  },
  session: {
    strategy: "jwt", // Use JWT for sessions
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET || "your-secret-key-change-in-production",
  trustHost: true, // Trust the host header (required for Railway/Docker deployments)
})
