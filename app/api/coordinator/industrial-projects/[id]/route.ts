import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { emitNotificationToUser } from '@/lib/socket-emitters';

// GET - Get a specific industrial project
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

    const industrialProject = await (prisma as any).industrialProject.findUnique({
      where: { id: projectId },
      include: {
        requests: true
      }
    });

    if (!industrialProject) {
      return NextResponse.json({ error: 'Industrial project not found' }, { status: 404 });
    }

    // Get requester info for each request
    const requestsWithUsers = await Promise.all(
      industrialProject.requests.map(async (req: any) => {
        const requester = await prisma.user.findUnique({
          where: { userId: req.requesterId },
          select: { userId: true, name: true, email: true, profileImage: true, role: true }
        });
        
        // Get group info if student
        let groupInfo = null;
        if (req.groupId) {
          groupInfo = await (prisma as any).group.findUnique({
            where: { groupId: req.groupId },
            include: {
              students: {
                include: {
                  user: {
                    select: { name: true, profileImage: true }
                  }
                }
              }
            }
          });
        }
        
        return { ...req, requester, groupInfo };
      })
    );

    return NextResponse.json({ ...industrialProject, requests: requestsWithUsers });
  } catch (error) {
    console.error('Error fetching industrial project:', error);
    return NextResponse.json({ error: 'Failed to fetch industrial project' }, { status: 500 });
  }
}

// PUT - Update an industrial project (Coordinator only)
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'coordinator') {
      return NextResponse.json({ error: 'Only coordinators can update industrial projects' }, { status: 403 });
    }

    const projectId = parseInt(params.id);
    const userId = parseInt(session.user.id);
    const body = await request.json();

    // Check if project exists and belongs to this coordinator
    const existingProject = await (prisma as any).industrialProject.findUnique({
      where: { id: projectId }
    });

    if (!existingProject) {
      return NextResponse.json({ error: 'Industrial project not found' }, { status: 404 });
    }

    if (existingProject.uploadedById !== userId) {
      return NextResponse.json({ error: 'Not authorized to update this project' }, { status: 403 });
    }

    const { title, description, features, techStack, thumbnailUrl, status } = body;

    const updatedProject = await (prisma as any).industrialProject.update({
      where: { id: projectId },
      data: {
        ...(title && { title }),
        ...(description && { description }),
        ...(features !== undefined && { features }),
        ...(techStack !== undefined && { techStack }),
        ...(thumbnailUrl !== undefined && { thumbnailUrl }),
        ...(status && { status }),
      }
    });

    return NextResponse.json(updatedProject);
  } catch (error) {
    console.error('Error updating industrial project:', error);
    return NextResponse.json({ error: 'Failed to update industrial project' }, { status: 500 });
  }
}

// DELETE - Delete an industrial project (Coordinator only)
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'coordinator') {
      return NextResponse.json({ error: 'Only coordinators can delete industrial projects' }, { status: 403 });
    }

    const projectId = parseInt(params.id);
    const userId = parseInt(session.user.id);

    // Check if project exists and belongs to this coordinator
    const existingProject = await (prisma as any).industrialProject.findUnique({
      where: { id: projectId }
    });

    if (!existingProject) {
      return NextResponse.json({ error: 'Industrial project not found' }, { status: 404 });
    }

    if (existingProject.uploadedById !== userId) {
      return NextResponse.json({ error: 'Not authorized to delete this project' }, { status: 403 });
    }

    // Don't allow deletion if project is booked
    if (existingProject.status === 'booked') {
      return NextResponse.json({ error: 'Cannot delete a booked project' }, { status: 400 });
    }

    await (prisma as any).industrialProject.delete({
      where: { id: projectId }
    });

    return NextResponse.json({ message: 'Industrial project deleted successfully' });
  } catch (error) {
    console.error('Error deleting industrial project:', error);
    return NextResponse.json({ error: 'Failed to delete industrial project' }, { status: 500 });
  }
}
