import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

// GET - Get admin dashboard stats
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Get all stats in parallel
    const [
      totalCampuses,
      totalCoordinators,
      totalSupervisors,
      totalStudents,
      totalGroups,
      campusStats,
    ] = await Promise.all([
      (prisma as any).campuses.count(),
      (prisma as any).users.count({
        where: { role: 'coordinator', status: { not: 'REMOVED' } },
      }),
      (prisma as any).users.count({
        where: { role: 'supervisor', status: { not: 'REMOVED' } },
      }),
      (prisma as any).users.count({
        where: { role: 'student', status: { not: 'REMOVED' } },
      }),
      (prisma as any).groups.count(),
      (prisma as any).campuses.findMany({
        include: {
          fyp_coordinators: {
            include: {
              users: {
                select: { status: true },
              },
            },
          },
          _count: {
            select: {
              students: true,
              fyp_supervisors: true,
            },
          },
        },
      }),
    ]);

    const formattedCampusStats = campusStats.map((campus: any) => ({
      campusId: campus.campus_id,
      name: campus.name,
      location: campus.location,
      maxCoordinators: campus.max_coordinators || 5,
      activeCoordinators: campus.fyp_coordinators.filter(
        (c: any) => c.users.status !== 'REMOVED'
      ).length,
      totalStudents: campus._count.students,
      totalSupervisors: campus._count.fyp_supervisors,
    }));

    return NextResponse.json({
      stats: {
        totalCampuses,
        totalCoordinators,
        totalSupervisors,
        totalStudents,
        totalGroups,
      },
      campusStats: formattedCampusStats,
    });
  } catch (error) {
    console.error('Error fetching admin dashboard:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}
