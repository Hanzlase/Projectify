import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

// Production flag for logging
const isProd = process.env.NODE_ENV === 'production';

export async function POST(request: Request) {
  try {
    const { identifier, password } = await request.json();

    if (!identifier || !password) {
      return NextResponse.json(
        { error: 'Please provide both identifier and password' },
        { status: 400 }
      );
    }

    // Optimized: Single query with selective fields
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier },
          { student: { rollNumber: identifier } },
          { name: identifier }
        ]
      },
      select: {
        userId: true,
        name: true,
        email: true,
        passwordHash: true,
        role: true,
        status: true,
        profileImage: true,
        createdAt: true,
        updatedAt: true,
        student: {
          select: {
            studentId: true,
            rollNumber: true,
            batch: true,
            campusId: true,
            groupId: true,
            isGroupAdmin: true,
            gpa: true,
            skills: true,
            interests: true,
            bio: true,
            linkedin: true,
            github: true,
            campus: {
              select: {
                campusId: true,
                name: true,
                location: true,
              }
            }
          }
        },
        supervisor: {
          select: {
            supervisorId: true,
            campusId: true,
            description: true,
            specialization: true,
            campus: {
              select: {
                campusId: true,
                name: true,
                location: true,
              }
            }
          }
        },
        coordinator: {
          select: {
            coordinatorId: true,
            campusId: true,
            campus: {
              select: {
                campusId: true,
                name: true,
                location: true,
              }
            }
          }
        },
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatch) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Get campusId and campus - already fetched with select
    const campusId = user.coordinator?.campusId 
      ?? user.supervisor?.campusId 
      ?? user.student?.campusId 
      ?? null;
    
    const campus = user.coordinator?.campus 
      ?? user.supervisor?.campus 
      ?? user.student?.campus 
      ?? null;

    // Return user data without password
    const { passwordHash, ...userWithoutPassword } = user;

    return NextResponse.json({
      success: true,
      user: {
        ...userWithoutPassword,
        campusId,
        campus,
      },
      role: user.role,
    });

  } catch (error) {
    if (!isProd) console.error('Login error:', error);
    return NextResponse.json(
      { error: 'An error occurred during login' },
      { status: 500 }
    );
  }
}
