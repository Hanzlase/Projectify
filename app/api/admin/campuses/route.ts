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

    const campuses = await prisma.campus.findMany({
      include: {
        coordinators: {
          include: {
            user: {
              select: {
                status: true,
              },
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
      orderBy: {
        name: 'asc',
      },
    });

    const formattedCampuses = campuses.map((campus) => ({
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
    const existingCampus = await prisma.campus.findFirst({
      where: { name },
    });

    if (existingCampus) {
      return NextResponse.json({ error: 'Campus name already exists' }, { status: 400 });
    }

    const campus = await prisma.campus.create({
      data: {
        name,
        location: location || null,
        maxCoordinators: maxCoordinators || 5,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      campus: {
        campusId: campus.campusId,
        name: campus.name,
        location: campus.location,
        maxCoordinators: campus.maxCoordinators || 5,
      },
    });
  } catch (error) {
    console.error('Error creating campus:', error);
    return NextResponse.json({ error: 'Failed to create campus' }, { status: 500 });
  }
}
