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

    const coordinators = await prisma.user.findMany({
      where: {
        role: 'coordinator',
      },
      include: {
        coordinator: {
          include: {
            campus: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const formattedCoordinators = coordinators.map((coord) => ({
      userId: coord.userId,
      name: coord.name,
      email: coord.email,
      status: coord.status,
      profileImage: coord.profileImage,
      createdAt: coord.createdAt,
      campus: coord.coordinator?.campus ? {
        campusId: coord.coordinator.campus.campusId,
        name: coord.coordinator.campus.name,
        location: coord.coordinator.campus.location,
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
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 400 });
    }

    // Check campus exists and get coordinator count
    const campus = await prisma.campus.findUnique({
      where: { campusId: parseInt(campusId) },
      include: {
        coordinators: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!campus) {
      return NextResponse.json({ error: 'Campus not found' }, { status: 404 });
    }

    // Check if max coordinators reached (default limit: 5)
    const MAX_COORDINATORS = 5;
    const activeCoordinators = campus.coordinators.filter(
      (c) => c.user.status !== 'REMOVED'
    );

    if (activeCoordinators.length >= MAX_COORDINATORS) {
      return NextResponse.json({ 
        error: `Maximum coordinators (${MAX_COORDINATORS}) reached for this campus` 
      }, { status: 400 });
    }

    // Hash password and create user
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash: hashedPassword,
        role: 'coordinator',
        updatedAt: new Date(),
        coordinator: {
          create: {
            campusId: parseInt(campusId),
            updatedAt: new Date(),
          },
        },
      },
      include: {
        coordinator: {
          include: {
            campus: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      coordinator: {
        userId: user.userId,
        name: user.name,
        email: user.email,
        status: user.status,
        campus: user.coordinator?.campus ? {
          campusId: user.coordinator.campus.campusId,
          name: user.coordinator.campus.name,
          location: user.coordinator.campus.location,
        } : null,
      },
    });
  } catch (error) {
    console.error('Error creating coordinator:', error);
    return NextResponse.json({ error: 'Failed to create coordinator' }, { status: 500 });
  }
}
