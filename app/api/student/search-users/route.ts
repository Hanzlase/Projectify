import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { getActivePhase } from '@/lib/cohort-utils';
import { FypPhase } from '@prisma/client';

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

    // Get current user's campus and cohort
    let campusId: number | null = null;
    let userCohort: any = null;
    
    if (session.user.role === 'student') {
      const student = await prisma.student.findUnique({
        where: { userId },
        select: { campusId: true, cohort: true }
      });
      campusId = student?.campusId || null;
      userCohort = student?.cohort || null;
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

      // Calculate dynamic active group counts for each searched supervisor
      const supervisorUserIds = supervisors.map((s: any) => s.userId);
      const groups = await prisma.group.findMany({
        where: { supervisorId: { in: supervisorUserIds } },
        include: {
          students: {
            include: {
              campus: true
            }
          }
        }
      });

      const projectIds = groups.map(g => g.projectId).filter(Boolean) as number[];
      const groupIds = groups.map(g => g.groupId);
      const projects = await prisma.project.findMany({
        where: {
          OR: [
            { projectId: { in: projectIds } },
            { groupId: { in: groupIds } }
          ]
        }
      });

      const formattedSupervisors = supervisors.map((s: any) => {
        const supGroups = groups.filter(g => g.supervisorId === s.userId);
        const activeCount = supGroups.filter(g => {
          const project = projects.find(p => p.groupId === g.groupId || (g.projectId && p.projectId === g.projectId));
          let isCompleted = false;
          if (project && (project.status === "completed" || project.status === "archived")) {
            isCompleted = true;
          } else if (g.fypPhase === FypPhase.FYP_2 && g.students.length > 0) {
            const student = g.students[0];
            const activePhase = getActivePhase(g.cohort, student.campus.activeSemester);
            if (activePhase === FypPhase.FYP_1) {
              isCompleted = true;
            }
          }
          return !isCompleted;
        }).length;

        return {
          userId: s.user.userId,
          name: s.user.name,
          email: s.user.email,
          profileImage: s.user.profileImage,
          specialization: s.specialization,
          totalGroups: activeCount,
          maxGroups: s.maxGroups
        };
      });

      return NextResponse.json({ users: formattedSupervisors });

    } else if (role === 'student') {
      // Search students by roll number (same cohort only)
      const students = await (prisma as any).student.findMany({
        where: {
          ...(campusId ? { campusId } : {}),
          cohort: userCohort || undefined, // Restrict to same cohort
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
