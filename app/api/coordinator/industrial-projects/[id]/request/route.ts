import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { emitNotificationToUser } from '@/lib/socket-emitters';

// POST - Request an industrial project (Students only)
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
      return NextResponse.json({ error: 'Only students can request industrial projects' }, { status: 403 });
    }

    const projectId = parseInt(params.id);
    const userId = parseInt(session.user.id);
    const body = await request.json();
    const { message } = body;

    // Check if student is already in a group
    const student = await prisma.student.findUnique({
      where: { userId },
      select: { groupId: true, studentId: true }
    });

    if (student?.groupId) {
      return NextResponse.json({ error: 'You are already in a group. Leave your current group before requesting a new project.' }, { status: 400 });
    }

    // Check if project exists and is available
    const industrialProject = await (prisma as any).industrialProject.findUnique({
      where: { id: projectId }
    });

    if (!industrialProject) {
      return NextResponse.json({ error: 'Industrial project not found' }, { status: 404 });
    }

    if (industrialProject.status !== 'available') {
      return NextResponse.json({ error: 'This project is no longer available' }, { status: 400 });
    }

    // Check if user already requested this project
    const existingRequest = await (prisma as any).industrialProjectRequest.findUnique({
      where: {
        industrialProjectId_requesterId: {
          industrialProjectId: projectId,
          requesterId: userId
        }
      }
    });

    if (existingRequest) {
      return NextResponse.json({ error: 'You have already requested this project' }, { status: 400 });
    }

    // Create the request (no groupId for now - will create group after approval)
    const projectRequest = await (prisma as any).industrialProjectRequest.create({
      data: {
        industrialProjectId: projectId,
        requesterId: userId,
        requesterRole: 'student',
        groupId: null,
        message,
        status: 'pending'
      }
    });

    // Notify the coordinator
    const requesterName = session.user.name || 'A user';
    emitNotificationToUser(industrialProject.uploadedById, {
      id: Date.now(),
      title: 'New Industrial Project Request',
      message: `${requesterName} has requested the industrial project "${industrialProject.title}"`,
      type: 'industrial_project_request',
      createdAt: new Date().toISOString()
    });

    return NextResponse.json(projectRequest, { status: 201 });
  } catch (error) {
    console.error('Error requesting industrial project:', error);
    return NextResponse.json({ error: 'Failed to request industrial project' }, { status: 500 });
  }
}

// PUT - Respond to a request (Coordinator only - approve/reject)
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
      return NextResponse.json({ error: 'Only coordinators can respond to requests' }, { status: 403 });
    }

    const projectId = parseInt(params.id);
    const userId = parseInt(session.user.id);
    const body = await request.json();
    const { requestId, status: newStatus } = body;

    if (!requestId || !newStatus || !['approved', 'rejected'].includes(newStatus)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    // Get the industrial project
    const industrialProject = await (prisma as any).industrialProject.findUnique({
      where: { id: projectId }
    });

    if (!industrialProject) {
      return NextResponse.json({ error: 'Industrial project not found' }, { status: 404 });
    }

    if (industrialProject.uploadedById !== userId) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Get the request
    const projectRequest = await (prisma as any).industrialProjectRequest.findUnique({
      where: { id: requestId }
    });

    if (!projectRequest || projectRequest.industrialProjectId !== projectId) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    if (projectRequest.status !== 'pending') {
      return NextResponse.json({ error: 'Request already processed' }, { status: 400 });
    }

    // Update the request
    const updatedRequest = await (prisma as any).industrialProjectRequest.update({
      where: { id: requestId },
      data: {
        status: newStatus,
        respondedAt: new Date()
      }
    });

    // If approved, mark the project as reserved (not booked yet - will be booked when group is created)
    if (newStatus === 'approved') {
      // Don't set status to 'booked' yet - the student needs to create a group first
      // The project will be marked as booked when the student creates a group with this industrial project

      // Reject all other pending requests
      await (prisma as any).industrialProjectRequest.updateMany({
        where: {
          industrialProjectId: projectId,
          id: { not: requestId },
          status: 'pending'
        },
        data: {
          status: 'rejected',
          respondedAt: new Date()
        }
      });

      // Notify rejected users
      const otherRequests = await (prisma as any).industrialProjectRequest.findMany({
        where: {
          industrialProjectId: projectId,
          id: { not: requestId }
        }
      });

      for (const req of otherRequests) {
        emitNotificationToUser(req.requesterId, {
          id: Date.now(),
          title: 'Industrial Project Request Rejected',
          message: `Your request for "${industrialProject.title}" was not approved as the project has been assigned to another requester.`,
          type: 'industrial_project_rejected',
          createdAt: new Date().toISOString()
        });
      }
    }

    // Notify the requester
    const statusMessage = newStatus === 'approved' 
      ? `Your request for "${industrialProject.title}" has been approved! You can now create a group and start working on this project.`
      : `Your request for "${industrialProject.title}" was not approved.`;

    emitNotificationToUser(projectRequest.requesterId, {
      id: Date.now(),
      title: newStatus === 'approved' ? 'Industrial Project Request Approved - Create Your Group!' : 'Industrial Project Request Rejected',
      message: statusMessage,
      type: newStatus === 'approved' ? 'industrial_project_approved' : 'industrial_project_rejected',
      createdAt: new Date().toISOString()
    });

    return NextResponse.json(updatedRequest);
  } catch (error) {
    console.error('Error responding to request:', error);
    return NextResponse.json({ error: 'Failed to respond to request' }, { status: 500 });
  }
}

// GET - Get user's request status for this project
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

    const existingRequest = await (prisma as any).industrialProjectRequest.findUnique({
      where: {
        industrialProjectId_requesterId: {
          industrialProjectId: projectId,
          requesterId: userId
        }
      }
    });

    return NextResponse.json({ request: existingRequest });
  } catch (error) {
    console.error('Error fetching request status:', error);
    return NextResponse.json({ error: 'Failed to fetch request status' }, { status: 500 });
  }
}
