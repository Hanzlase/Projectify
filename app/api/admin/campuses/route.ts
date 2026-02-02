import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

// GET - Get all campuses with coordinator count
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const campuses = await (prisma as any).campuses.findMany({
      include: {
        fyp_coordinators: {
          include: {
            users: {
              select: {
                status: true,
              },
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
      orderBy: {
        name: 'asc',
      },
    });

    const formattedCampuses = campuses.map((campus: any) => ({
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

    return NextResponse.json({ campuses: formattedCampuses });
  } catch (error) {
    console.error('Error fetching campuses:', error);
    return NextResponse.json({ error: 'Failed to fetch campuses' }, { status: 500 });
  }
}

// POST - Create a new campus
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    const { name, location, maxCoordinators } = body;

    if (!name) {
      return NextResponse.json({ error: 'Campus name is required' }, { status: 400 });
    }

    // Check if campus name already exists
    const existingCampus = await (prisma as any).campuses.findFirst({
      where: { name },
    });

    if (existingCampus) {
      return NextResponse.json({ error: 'Campus name already exists' }, { status: 400 });
    }

    const campus = await (prisma as any).campuses.create({
      data: {
        name,
        location: location || null,
        max_coordinators: maxCoordinators || 5,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      campus: {
        campusId: campus.campus_id,
        name: campus.name,
        location: campus.location,
        maxCoordinators: campus.max_coordinators || 5,
      },
    });
  } catch (error) {
    console.error('Error creating campus:', error);
    return NextResponse.json({ error: 'Failed to create campus' }, { status: 500 });
  }
}
