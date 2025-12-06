import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

// PUT - Mark notification as read
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const { id } = await params;
    const notificationId = parseInt(id);

    if (isNaN(notificationId)) {
      return NextResponse.json({ error: 'Invalid notification ID' }, { status: 400 });
    }

    // Update the notification recipient record
    const updated = await prisma.notificationRecipient.updateMany({
      where: {
        notificationId,
        userId: userId
      },
      data: {
        isRead: true,
        readAt: new Date()
      }
    });

    if (updated.count === 0) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return NextResponse.json({ error: 'Failed to update notification' }, { status: 500 });
  }
}

// DELETE - Delete/dismiss a notification
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const { id } = await params;
    const notificationId = parseInt(id);

    if (isNaN(notificationId)) {
      return NextResponse.json({ error: 'Invalid notification ID' }, { status: 400 });
    }

    // For coordinators - delete the entire notification if they created it
    if (session.user.role === 'coordinator') {
      const notification = await prisma.notification.findUnique({
        where: { notificationId }
      });

      if (notification && notification.createdById === userId) {
        // Delete the notification (cascades to recipients)
        await prisma.notification.delete({
          where: { notificationId }
        });
        return NextResponse.json({ success: true });
      }
    }

    // For students/supervisors (or coordinators viewing others' notifications) - 
    // Remove the recipient record (dismiss from their view)
    const deleted = await prisma.notificationRecipient.deleteMany({
      where: {
        notificationId,
        userId: userId
      }
    });

    if (deleted.count === 0) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting notification:', error);
    return NextResponse.json({ error: 'Failed to delete notification' }, { status: 500 });
  }
}
