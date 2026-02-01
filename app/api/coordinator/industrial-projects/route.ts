import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

// GET - Fetch all industrial projects for the coordinator's campus
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'all';
    const search = searchParams.get('search') || '';

    // Get campus based on user role
    let campusId: number | null = null;
    
    if (session.user.role === 'coordinator') {
      const coordinator = await prisma.fYPCoordinator.findUnique({
        where: { userId },
        select: { campusId: true }
      });
      campusId = coordinator?.campusId || null;
    } else if (session.user.role === 'supervisor') {
      const supervisor = await prisma.fYPSupervisor.findUnique({
        where: { userId },
        select: { campusId: true }
      });
      campusId = supervisor?.campusId || null;
    } else if (session.user.role === 'student') {
      const student = await prisma.student.findUnique({
        where: { userId },
        select: { campusId: true }
      });
      campusId = student?.campusId || null;
    }

    if (!campusId) {
      return NextResponse.json({ error: 'Campus not found' }, { status: 404 });
    }

    // Build where clause
    const whereClause: any = { campusId };

    if (status !== 'all') {
      whereClause.status = status;
    }

    if (search) {
      whereClause.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { features: { contains: search, mode: 'insensitive' } },
        { techStack: { contains: search, mode: 'insensitive' } },
      ];
    }

    const industrialProjects = await (prisma as any).industrialProject.findMany({
      where: whereClause,
      include: {
        requests: {
          include: {
            // We'll get requester info separately
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Get requester info for each request
    const projectsWithDetails = await Promise.all(
      industrialProjects.map(async (project: any) => {
        const requestsWithUsers = await Promise.all(
          project.requests.map(async (req: any) => {
            const requester = await prisma.user.findUnique({
              where: { userId: req.requesterId },
              select: { userId: true, name: true, email: true, profileImage: true, role: true }
            });
            return { ...req, requester };
          })
        );
        return { ...project, requests: requestsWithUsers };
      })
    );

    return NextResponse.json({ industrialProjects: projectsWithDetails });
  } catch (error) {
    console.error('Error fetching industrial projects:', error);
    return NextResponse.json({ error: 'Failed to fetch industrial projects' }, { status: 500 });
  }
}

// POST - Create a new industrial project (Coordinator only)
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'coordinator') {
      return NextResponse.json({ error: 'Only coordinators can upload industrial projects' }, { status: 403 });
    }

    const userId = parseInt(session.user.id);
    const body = await request.json();
    const { title, description, features, techStack, thumbnailUrl } = body;

    if (!title || !description) {
      return NextResponse.json({ error: 'Title and description are required' }, { status: 400 });
    }

    // Get coordinator's campus
    const coordinator = await prisma.fYPCoordinator.findUnique({
      where: { userId },
      select: { campusId: true }
    });

    if (!coordinator) {
      return NextResponse.json({ error: 'Coordinator not found' }, { status: 404 });
    }

    const industrialProject = await (prisma as any).industrialProject.create({
      data: {
        title,
        description,
        features,
        techStack,
        thumbnailUrl,
        uploadedById: userId,
        campusId: coordinator.campusId,
        status: 'available'
      }
    });

    return NextResponse.json(industrialProject, { status: 201 });
  } catch (error) {
    console.error('Error creating industrial project:', error);
    return NextResponse.json({ error: 'Failed to create industrial project' }, { status: 500 });
  }
}
