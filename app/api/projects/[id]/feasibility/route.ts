import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { generateFeasibilityReport } from '@/lib/cohere';

// GET - Generate feasibility report for a project
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const projectId = parseInt(params.id);
    const userId = parseInt(session.user.id);

    const project = await (prisma as any).project.findUnique({
      where: { projectId },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Check access
    let hasAccess = false;
    
    if (project.visibility === 'public') {
      hasAccess = true;
    } else if (project.createdById === userId) {
      hasAccess = true;
    } else if (session.user.role === 'coordinator') {
      hasAccess = true;
    } else if (session.user.role === 'supervisor') {
      const group = await (prisma as any).group.findFirst({
        where: {
          projectId: projectId,
          supervisorId: userId
        }
      });
      hasAccess = !!group;
    }

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Generate the feasibility report using AI
    const projectInfo = {
      title: project.title,
      abstract: project.abstractText || project.description,
      description: project.description,
      categories: project.category ? project.category.split(', ') : ['General']
    };

    const feasibilityReport = await generateFeasibilityReport(projectInfo);

    return NextResponse.json({ 
      feasibilityReport,
      project: {
        projectId: project.projectId,
        title: project.title,
        isUnique: project.isUnique,
        similarityScore: project.similarityScore
      }
    });
  } catch (error) {
    console.error('Error generating feasibility report:', error);
    return NextResponse.json({ error: 'Failed to generate feasibility report' }, { status: 500 });
  }
}
