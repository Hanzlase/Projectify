import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

// GET - Search for supervisors and students for group creation
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const { searchParams } = new URL(req.url);
    const role = searchParams.get('role'); // 'supervisor' or 'student'
    const search = searchParams.get('search') || '';

    if (!role || !['supervisor', 'student'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role parameter' }, { status: 400 });
    }

    // Get current user's campus
    let campusId: number | null = null;
    
    if (session.user.role === 'student') {
      const student = await prisma.student.findUnique({
        where: { userId },
        select: { campusId: true }
      });
      campusId = student?.campusId || null;
    }

    if (role === 'supervisor') {
      // Search supervisors by name or email
      const supervisors = await (prisma as any).fYPSupervisor.findMany({
        where: {
          ...(campusId ? { campusId } : {}),
          user: {
            status: 'ACTIVE',
            OR: search ? [
              { name: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } }
            ] : undefined
          }
        },
        include: {
          user: {
            select: {
              userId: true,
              name: true,
              email: true,
              profileImage: true,
            }
          }
        },
        take: 10
      });

      const formattedSupervisors = supervisors.map((s: any) => ({
        userId: s.user.userId,
        name: s.user.name,
        email: s.user.email,
        profileImage: s.user.profileImage,
        specialization: s.specialization,
        totalGroups: s.totalGroups,
        maxGroups: s.maxGroups
      }));

      return NextResponse.json({ users: formattedSupervisors });

    } else if (role === 'student') {
      // Search students by roll number
      const students = await (prisma as any).student.findMany({
        where: {
          ...(campusId ? { campusId } : {}),
          userId: { not: userId }, // Exclude current user
          groupId: null, // Only students without a group
          ...(search ? {
            rollNumber: { contains: search, mode: 'insensitive' }
          } : {}),
          user: {
            status: 'ACTIVE'
          }
        },
        include: {
          user: {
            select: {
              userId: true,
              name: true,
              email: true,
              profileImage: true,
            }
          }
        },
        take: 10
      });

      const formattedStudents = students.map((s: any) => ({
        userId: s.user.userId,
        studentId: s.studentId,
        name: s.user.name,
        email: s.user.email,
        rollNumber: s.rollNumber,
        profileImage: s.user.profileImage,
        hasGroup: false
      }));

      return NextResponse.json({ users: formattedStudents });
    }

    return NextResponse.json({ users: [] });

  } catch (error) {
    console.error('Error searching users:', error);
    return NextResponse.json({ error: 'Failed to search users' }, { status: 500 });
  }
}
