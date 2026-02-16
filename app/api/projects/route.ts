import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { generateEmbedding } from '@/lib/cohere';
import { addProjectEmbedding, searchSimilarProjects, checkUniqueness } from '@/lib/pinecone';

// GET - Fetch projects
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'my'; // my, public, all
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const status = searchParams.get('status') || '';

    const userId = parseInt(session.user.id);

    // Get user's campus
    let campusId: number | null = null;
    if (session.user.role === 'student') {
      const student = await prisma.student.findUnique({
        where: { userId },
        select: { campusId: true }
      });
      campusId = student?.campusId || null;
    } else if (session.user.role === 'supervisor') {
      const supervisor = await prisma.fYPSupervisor.findUnique({
        where: { userId },
        select: { campusId: true }
      });
      campusId = supervisor?.campusId || null;
    } else if (session.user.role === 'coordinator') {
      const coordinator = await prisma.fYPCoordinator.findUnique({
        where: { userId },
        select: { campusId: true }
      });
      campusId = coordinator?.campusId || null;
    }

    let whereClause: any = {};

    if (filter === 'my') {
      whereClause.createdById = userId;
    } else if (filter === 'public') {
      whereClause.visibility = 'public';
      if (campusId) {
        whereClause.campusId = campusId;
      }
    } else if (filter === 'all' && session.user.role === 'coordinator') {
      // Coordinators can see all projects in their campus
      if (campusId) {
        whereClause.campusId = campusId;
      }
    }

    if (search) {
      whereClause.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (category) {
      whereClause.category = { contains: category, mode: 'insensitive' };
    }

    if (status) {
      // Handle multiple statuses separated by comma
      const statuses = status.split(',').map(s => s.trim()).filter(s => s);
      if (statuses.length === 1) {
        whereClause.status = statuses[0];
      } else if (statuses.length > 1) {
        whereClause.status = { in: statuses };
      }
    }

    const projects = await (prisma as any).project.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
    });

    // Get creator info for each project
    const projectsWithCreators = await Promise.all(
      projects.map(async (project: any) => {
        const creator = await prisma.user.findUnique({
          where: { userId: project.createdById },
          select: { userId: true, name: true, profileImage: true, role: true }
        });
        return { ...project, creator };
      })
    );

    return NextResponse.json({ projects: projectsWithCreators });
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
  }
}

// POST - Create a new project
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const body = await request.json();
    const {
      title,
      description,
      abstractText,
      category,
      status,
      visibility,
      thumbnailUrl,
      documentUrl,
      documentName,
      repositoryUrl,
      demoUrl,
      skipSimilarityCheck, // For pre-checked projects
      feasibilityReport, // Feasibility report from similarity check
    } = body;

    if (!title || !description) {
      return NextResponse.json({ error: 'Title and description are required' }, { status: 400 });
    }

    // Get user's campus and group
    let campusId: number = 1;
    let groupId: number | null = null;

    if (session.user.role === 'student') {
      const student = await prisma.student.findUnique({
        where: { userId },
        select: { campusId: true, groupId: true }
      });
      if (student) {
        campusId = student.campusId;
        groupId = student.groupId;
      }
    } else if (session.user.role === 'supervisor') {
      const supervisor = await prisma.fYPSupervisor.findUnique({
        where: { userId },
        select: { campusId: true }
      });
      if (supervisor) {
        campusId = supervisor.campusId;
      }
    } else if (session.user.role === 'coordinator') {
      const coordinator = await prisma.fYPCoordinator.findUnique({
        where: { userId },
        select: { campusId: true }
      });
      if (coordinator) {
        campusId = coordinator.campusId;
      }
    }

    const project = await (prisma as any).project.create({
      data: {
        title,
        description,
        abstractText: abstractText || null,
        category: category || null,
        status: status || 'idea',
        visibility: visibility || 'private',
        thumbnailUrl: thumbnailUrl || null,
        documentUrl: documentUrl || null,
        documentName: documentName || null,
        repositoryUrl: repositoryUrl || null,
        demoUrl: demoUrl || null,
        createdById: userId,
        groupId,
        campusId,
        isUnique: skipSimilarityCheck ? true : false,
        feasibilityReport: feasibilityReport || null,
      },
    });

    // ALWAYS save embedding for unique projects (both public AND private)
    // This ensures RAG can detect similar projects regardless of visibility
    if (abstractText && skipSimilarityCheck) {
      try {
        console.log(`Creating embedding for project ${project.projectId} (${visibility} visibility)...`);
        const combinedText = `${title} ${abstractText} ${description}`;
        const embedding = await generateEmbedding(combinedText);
        
        console.log(`Saving embedding to Pinecone for project ${project.projectId}...`);
        const embeddingId = await addProjectEmbedding(embedding, {
          projectId: project.projectId,
          title,
          abstract: abstractText,
          description,
          documentUrl: documentUrl || null,
          createdById: userId,
          campusId,
          createdAt: new Date().toISOString(),
        });

        console.log(`Embedding saved with ID: ${embeddingId}`);

        // Update project with embedding ID
        await (prisma as any).project.update({
          where: { projectId: project.projectId },
          data: { 
            embeddingId,
            isUnique: true,
          },
        });
        
        console.log(`Project ${project.projectId} updated with embedding ID`);
      } catch (embeddingError) {
        console.error('Error creating embedding:', embeddingError);
        // Project is still created, just without embedding
      }
    }

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
  }
}
