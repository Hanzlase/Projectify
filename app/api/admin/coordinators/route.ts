import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import bcrypt from 'bcryptjs';

// GET - Get all coordinators with their campus info
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const coordinators = await (prisma as any).users.findMany({
      where: {
        role: 'coordinator',
      },
      include: {
        fyp_coordinators: {
          include: {
            campuses: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const formattedCoordinators = coordinators.map((coord: any) => ({
      userId: coord.user_id,
      name: coord.name,
      email: coord.email,
      status: coord.status,
      profileImage: coord.profile_image,
      createdAt: coord.createdAt,
      campus: coord.fyp_coordinators?.campuses ? {
        campusId: coord.fyp_coordinators.campuses.campus_id,
        name: coord.fyp_coordinators.campuses.name,
        location: coord.fyp_coordinators.campuses.location,
      } : null,
    }));

    return NextResponse.json({ coordinators: formattedCoordinators });
  } catch (error) {
    console.error('Error fetching coordinators:', error);
    return NextResponse.json({ error: 'Failed to fetch coordinators' }, { status: 500 });
  }
}

// POST - Create a new coordinator
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
    const { name, email, password, campusId } = body;

    if (!name || !email || !password || !campusId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if email already exists
    const existingUser = await (prisma as any).users.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 400 });
    }

    // Check campus exists and get coordinator count
    const campus = await (prisma as any).campuses.findUnique({
      where: { campus_id: parseInt(campusId) },
      include: {
        fyp_coordinators: {
          include: {
            users: true,
          },
        },
      },
    });

    if (!campus) {
      return NextResponse.json({ error: 'Campus not found' }, { status: 404 });
    }

    // Check if max coordinators reached
    const activeCoordinators = campus.fyp_coordinators.filter(
      (c: any) => c.users.status !== 'REMOVED'
    );

    if (activeCoordinators.length >= (campus.max_coordinators || 5)) {
      return NextResponse.json({ 
        error: `Maximum coordinators (${campus.max_coordinators || 5}) reached for this campus` 
      }, { status: 400 });
    }

    // Hash password and create user
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await (prisma as any).users.create({
      data: {
        name,
        email,
        password_hash: hashedPassword,
        role: 'coordinator',
        updatedAt: new Date(),
        fyp_coordinators: {
          create: {
            campus_id: parseInt(campusId),
            updatedAt: new Date(),
          },
        },
      },
      include: {
        fyp_coordinators: {
          include: {
            campuses: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      coordinator: {
        userId: user.user_id,
        name: user.name,
        email: user.email,
        status: user.status,
        campus: user.fyp_coordinators?.campuses ? {
          campusId: user.fyp_coordinators.campuses.campus_id,
          name: user.fyp_coordinators.campuses.name,
          location: user.fyp_coordinators.campuses.location,
        } : null,
      },
    });
  } catch (error) {
    console.error('Error creating coordinator:', error);
    return NextResponse.json({ error: 'Failed to create coordinator' }, { status: 500 });
  }
}
