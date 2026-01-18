import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { deleteProjectEmbedding } from '@/lib/qdrant';
import { emitProjectStatus, emitProjectStatusToUsers } from '@/lib/socket-emitters';

// GET - Fetch single project
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

    // Check access - supervisors can view projects from their groups
    let hasAccess = false;
    
    if (project.visibility === 'public') {
      hasAccess = true;
    } else if (project.createdById === userId) {
      hasAccess = true;
    } else if (session.user.role === 'coordinator') {
      hasAccess = true;
    } else if (session.user.role === 'supervisor') {
      // Check if supervisor is assigned to the group that has this project
      const group = await (prisma as any).group.findFirst({
        where: {
          projectId: projectId,
          supervisorId: userId
        }
      });
      // Also check if there's a pending/accepted invitation for this supervisor
      const invitation = await (prisma as any).groupInvitation.findFirst({
        where: {
          group: { projectId: projectId },
          inviteeId: userId,
          inviteeRole: 'supervisor'
        }
      });
      hasAccess = !!group || !!invitation;
    }

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get creator info
    const creator = await prisma.user.findUnique({
      where: { userId: project.createdById },
      select: { userId: true, name: true, profileImage: true, role: true }
    });

    // Check if project is assigned to a group
    const assignedGroup = await (prisma as any).group.findFirst({
      where: { projectId },
      select: { 
        groupId: true, 
        groupName: true,
        students: {
          select: {
            user: {
              select: { name: true }
            }
          },
          take: 1
        }
      }
    });

    return NextResponse.json({ 
      project: { 
        ...project, 
        creator,
        isAssignedToGroup: !!assignedGroup,
        assignedGroup: assignedGroup ? {
          groupId: assignedGroup.groupId,
          groupName: assignedGroup.groupName
        } : null
      } 
    });
  } catch (error) {
    console.error('Error fetching project:', error);
    return NextResponse.json({ error: 'Failed to fetch project' }, { status: 500 });
  }
}

// PUT - Update project
export async function PUT(
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

    // Check if project exists and user owns it
    const existingProject = await (prisma as any).project.findUnique({
      where: { projectId },
    });

    if (!existingProject) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (existingProject.createdById !== userId && session.user.role !== 'coordinator') {
      return NextResponse.json({ error: 'Not authorized to edit this project' }, { status: 403 });
    }

    // Check if project is assigned to a group - cannot edit if so
    const groupWithProject = await (prisma as any).group.findFirst({
      where: { projectId }
    });

    if (groupWithProject) {
      return NextResponse.json({ 
        error: 'This project is assigned to a group and cannot be edited. Please contact the group or coordinator.',
        isGroupProject: true
      }, { status: 403 });
    }

    const body = await request.json();
    const {
      title,
      description,
      category,
      technologies,
      status,
      visibility,
      thumbnailUrl,
      documentUrl,
      repositoryUrl,
      demoUrl
    } = body;

    const updatedProject = await (prisma as any).project.update({
      where: { projectId },
      data: {
        title: title || existingProject.title,
        description: description || existingProject.description,
        category: category !== undefined ? category : existingProject.category,
        technologies: technologies ? JSON.stringify(technologies) : existingProject.technologies,
        status: status || existingProject.status,
        visibility: visibility || existingProject.visibility,
        thumbnailUrl: thumbnailUrl !== undefined ? thumbnailUrl : existingProject.thumbnailUrl,
        documentUrl: documentUrl !== undefined ? documentUrl : existingProject.documentUrl,
        repositoryUrl: repositoryUrl !== undefined ? repositoryUrl : existingProject.repositoryUrl,
        demoUrl: demoUrl !== undefined ? demoUrl : existingProject.demoUrl,
      },
    });

    // Emit project status update via WebSocket
    if (existingProject.campusId) {
      emitProjectStatus(existingProject.campusId, {
        projectId,
        status: updatedProject.status,
        title: updatedProject.title,
        updatedAt: new Date().toISOString(),
      });
    }

    return NextResponse.json(updatedProject);
  } catch (error) {
    console.error('Error updating project:', error);
    return NextResponse.json({ error: 'Failed to update project' }, { status: 500 });
  }
}

// DELETE - Delete project
export async function DELETE(
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

    // Check if project exists and user owns it
    const existingProject = await (prisma as any).project.findUnique({
      where: { projectId },
    });

    if (!existingProject) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (existingProject.createdById !== userId && session.user.role !== 'coordinator') {
      return NextResponse.json({ error: 'Not authorized to delete this project' }, { status: 403 });
    }

    // Check if project is assigned to a group - cannot delete if so
    const groupWithProject = await (prisma as any).group.findFirst({
      where: { projectId }
    });

    if (groupWithProject) {
      return NextResponse.json({ 
        error: 'This project is assigned to a group and cannot be deleted. The group must be dissolved first.',
        isGroupProject: true
      }, { status: 403 });
    }

    // Delete embedding from Qdrant if it exists
    if (existingProject.embeddingId) {
      try {
        await deleteProjectEmbedding(existingProject.embeddingId);
      } catch (error) {
        console.error('Error deleting embedding:', error);
        // Continue with project deletion even if embedding deletion fails
      }
    }

    await (prisma as any).project.delete({
      where: { projectId },
    });

    return NextResponse.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Error deleting project:', error);
    return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 });
  }
}
