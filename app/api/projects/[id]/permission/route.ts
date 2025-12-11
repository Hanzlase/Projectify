import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

// GET - Check permission status for a project
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

    // Get existing permission request
    const permissionRequest = await (prisma as any).projectPermissionRequest.findUnique({
      where: {
        projectId_requesterId: {
          projectId,
          requesterId: userId
        }
      }
    });

    return NextResponse.json({ 
      permissionRequest,
      hasRequested: !!permissionRequest,
      status: permissionRequest?.status || null
    });
  } catch (error) {
    console.error('Error checking permission:', error);
    return NextResponse.json({ error: 'Failed to check permission' }, { status: 500 });
  }
}

// POST - Request permission to use a project
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'student') {
      return NextResponse.json({ error: 'Only students can request project permissions' }, { status: 403 });
    }

    const projectId = parseInt(params.id);
    const userId = parseInt(session.user.id);
    const body = await request.json();
    const { message } = body;

    // Get the project
    const project = await (prisma as any).project.findUnique({
      where: { projectId }
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Get the creator info
    const creator = await prisma.user.findUnique({
      where: { userId: project.createdById }
    });

    if (!creator || creator.role !== 'supervisor') {
      return NextResponse.json({ error: 'This project was not uploaded by a supervisor' }, { status: 400 });
    }

    // Get student info including group
    const student = await prisma.student.findUnique({
      where: { userId },
      include: { 
        user: true,
        group: true
      }
    });

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Check if already requested
    const existingRequest = await (prisma as any).projectPermissionRequest.findUnique({
      where: {
        projectId_requesterId: {
          projectId,
          requesterId: userId
        }
      }
    });

    if (existingRequest) {
      return NextResponse.json({ 
        error: 'You have already requested permission for this project',
        status: existingRequest.status
      }, { status: 400 });
    }

    // Create permission request
    const permissionRequest = await (prisma as any).projectPermissionRequest.create({
      data: {
        projectId,
        requesterId: userId,
        ownerId: project.createdById,
        groupId: student.groupId,
        message: message || null
      }
    });

    // Get coordinator's campus for notification
    const supervisor = await prisma.fYPSupervisor.findUnique({
      where: { userId: project.createdById }
    });

    // Send notification to the supervisor
    if (supervisor) {
      await prisma.notification.create({
        data: {
          title: 'Project Permission Request',
          message: `**${student.user.name}** (${student.rollNumber}) is requesting permission to use your project "${project.title}" for their FYP.${message ? `\n\n**Message:** ${message}` : ''}`,
          type: 'general',
          targetType: 'specific_users',
          createdById: userId,
          campusId: supervisor.campusId,
          recipients: {
            create: {
              userId: project.createdById
            }
          }
        }
      });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Permission request sent successfully',
      permissionRequest 
    });
  } catch (error) {
    console.error('Error requesting permission:', error);
    return NextResponse.json({ error: 'Failed to send permission request' }, { status: 500 });
  }
}

// PUT - Respond to permission request (approve/reject)
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
    const body = await request.json();
    const { requesterId, status, responseMessage } = body;

    if (!['approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // Get the project
    const project = await (prisma as any).project.findUnique({
      where: { projectId }
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Verify the user is the project owner
    if (project.createdById !== userId) {
      return NextResponse.json({ error: 'Not authorized to respond to this request' }, { status: 403 });
    }

    // Update the permission request
    const permissionRequest = await (prisma as any).projectPermissionRequest.update({
      where: {
        projectId_requesterId: {
          projectId,
          requesterId: parseInt(requesterId)
        }
      },
      data: {
        status,
        respondedAt: new Date()
      }
    });

    // Get requester info
    const requester = await prisma.user.findUnique({
      where: { userId: parseInt(requesterId) }
    });

    // Get student info for campus
    const student = await prisma.student.findUnique({
      where: { userId: parseInt(requesterId) }
    });

    // Send notification to the requester
    if (requester && student) {
      const statusText = status === 'approved' ? 'approved' : 'declined';
      await prisma.notification.create({
        data: {
          title: `Project Permission ${status === 'approved' ? 'Approved' : 'Declined'}`,
          message: `Your request to use the project "${project.title}" has been ${statusText}.${responseMessage ? `\n\n**Message from supervisor:** ${responseMessage}` : ''}`,
          type: status === 'approved' ? 'general' : 'urgent',
          targetType: 'specific_users',
          createdById: userId,
          campusId: student.campusId,
          recipients: {
            create: {
              userId: parseInt(requesterId)
            }
          }
        }
      });
    }

    return NextResponse.json({ 
      success: true, 
      message: `Permission request ${status}`,
      permissionRequest 
    });
  } catch (error) {
    console.error('Error responding to permission request:', error);
    return NextResponse.json({ error: 'Failed to respond to permission request' }, { status: 500 });
  }
}
