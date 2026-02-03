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
      prisma.campus.count(),
      prisma.user.count({
        where: { role: 'coordinator', status: { not: 'REMOVED' } },
      }),
      prisma.user.count({
        where: { role: 'supervisor', status: { not: 'REMOVED' } },
      }),
      prisma.user.count({
        where: { role: 'student', status: { not: 'REMOVED' } },
      }),
      prisma.group.count(),
      prisma.campus.findMany({
        include: {
          coordinators: {
            include: {
              user: {
                select: { status: true },
              },
            },
          },
          _count: {
            select: {
              students: true,
              supervisors: true,
            },
          },
        },
      }),
    ]);

    const formattedCampusStats = campusStats.map((campus) => ({
      campusId: campus.campusId,
      name: campus.name,
      location: campus.location,
      maxCoordinators: campus.maxCoordinators || 5,
      activeCoordinators: campus.coordinators.filter(
        (c) => c.user.status !== 'REMOVED'
      ).length,
      totalStudents: campus._count.students,
      totalSupervisors: campus._count.supervisors,
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
