import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

// GET - Fetch notifications for the current user
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);

    // Get notifications for this user
    const notifications = await prisma.notificationRecipient.findMany({
      where: {
        userId: userId
      },
      include: {
        notification: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Get unread count
    const unreadCount = await prisma.notificationRecipient.count({
      where: {
        userId: userId,
        isRead: false
      }
    });

    return NextResponse.json({
      notifications: notifications.map((nr: any) => ({
        id: nr.notification.notificationId,
        title: nr.notification.title,
        message: nr.notification.message,
        type: nr.notification.type,
        isRead: nr.isRead,
        readAt: nr.readAt,
        createdAt: nr.notification.createdAt,
        createdById: nr.notification.createdById
      })),
      unreadCount
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
  }
}

// POST - Create a new notification (coordinator only)
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (session.user.role !== 'coordinator') {
      return NextResponse.json({ error: 'Only coordinators can create notifications' }, { status: 403 });
    }

    const userId = parseInt(session.user.id);
    const body = await request.json();
    const { title, message, type = 'general', targetType, specificUserIds = [] } = body;

    if (!title || !message || !targetType) {
      return NextResponse.json({ error: 'Title, message, and target type are required' }, { status: 400 });
    }

    // Get the coordinator's campus
    const coordinator = await prisma.fYPCoordinator.findUnique({
      where: { userId: userId }
    });

    if (!coordinator) {
      return NextResponse.json({ error: 'Coordinator not found' }, { status: 404 });
    }

    const campusId = coordinator.campusId;

    // Determine recipients based on target type
    let recipientIds: number[] = [];

    switch (targetType) {
      case 'all_users':
        // Get all students and supervisors on this campus (exclude coordinators)
        const allStudents = await prisma.student.findMany({
          where: { campusId },
          select: { userId: true }
        });
        const allSupervisors = await prisma.fYPSupervisor.findMany({
          where: { campusId },
          select: { userId: true }
        });
        recipientIds = [
          ...allStudents.map(s => s.userId),
          ...allSupervisors.map(s => s.userId)
        ];
        break;

      case 'all_students':
        const students = await prisma.student.findMany({
          where: { campusId },
          select: { userId: true }
        });
        recipientIds = students.map(s => s.userId);
        break;

      case 'all_supervisors':
        const supervisors = await prisma.fYPSupervisor.findMany({
          where: { campusId },
          select: { userId: true }
        });
        recipientIds = supervisors.map(s => s.userId);
        break;

      case 'specific_users':
        if (!specificUserIds || specificUserIds.length === 0) {
          return NextResponse.json({ error: 'Please select at least one user' }, { status: 400 });
        }
        // Verify all users are from the same campus
        const validUsers = await prisma.user.findMany({
          where: {
            userId: { in: specificUserIds },
            OR: [
              { student: { campusId } },
              { supervisor: { campusId } }
            ]
          },
          select: { userId: true }
        });
        recipientIds = validUsers.map(u => u.userId);
        break;

      default:
        return NextResponse.json({ error: 'Invalid target type' }, { status: 400 });
    }

    if (recipientIds.length === 0) {
      return NextResponse.json({ error: 'No recipients found for this notification' }, { status: 400 });
    }

    // Create the notification with recipients
    const notification = await prisma.notification.create({
      data: {
        title,
        message,
        type,
        targetType,
        createdById: userId,
        campusId,
        recipients: {
          create: recipientIds.map(uid => ({
            userId: uid
          }))
        }
      },
      include: {
        recipients: true
      }
    });

    return NextResponse.json({
      success: true,
      message: `Notification sent to ${recipientIds.length} user(s)`,
      notification: {
        id: notification.notificationId,
        title: notification.title,
        recipientCount: notification.recipients.length
      }
    });
  } catch (error) {
    console.error('Error creating notification:', error);
    return NextResponse.json({ error: 'Failed to create notification' }, { status: 500 });
  }
}

// DELETE - Delete all notifications for the current user (dismiss all from their view)
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);

    // Delete all notification recipient records for this user
    const deleted = await prisma.notificationRecipient.deleteMany({
      where: {
        userId: userId
      }
    });

    return NextResponse.json({ 
      success: true,
      deletedCount: deleted.count 
    });
  } catch (error) {
    console.error('Error deleting all notifications:', error);
    return NextResponse.json({ error: 'Failed to delete notifications' }, { status: 500 });
  }
}
