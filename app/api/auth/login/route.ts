import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcrypt';

export async function POST(request: Request) {
  try {
    const { identifier, password } = await request.json();

    if (!identifier || !password) {
      return NextResponse.json(
        { error: 'Please provide both identifier and password' },
        { status: 400 }
      );
    }

    // Find user by email, roll number, or username (for coordinators)
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier },
          { student: { rollNumber: identifier } },
          { name: identifier }
        ]
      },
      include: {
        student: true,
        supervisor: true,
        coordinator: true,
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

    // Return user data without password
    const { passwordHash, ...userWithoutPassword } = user;

    // Add campusId and campus info to user data
    let campusId = null;
    let campus = null;
    
    if (user.coordinator) {
      campusId = user.coordinator.campusId;
    } else if (user.supervisor) {
      campusId = user.supervisor.campusId;
    } else if (user.student) {
      campusId = user.student.campusId;
    }

    // Fetch campus details if campusId exists
    if (campusId) {
      campus = await prisma.campus.findUnique({
        where: { campusId },
        select: {
          campusId: true,
          name: true,
          location: true,
        },
      });
    }

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
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'An error occurred during login' },
      { status: 500 }
    );
  }
}
