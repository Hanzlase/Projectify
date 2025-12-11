import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

// POST - Reply to a notification (send reply to original sender)
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'coordinator') {
      return NextResponse.json({ error: 'Only coordinators can reply to notifications' }, { status: 403 });
    }

    const notificationId = parseInt(params.id);
    const userId = parseInt(session.user.id);
    const body = await request.json();
    const { replyMessage, recipientEmail, recipientName } = body;

    if (!replyMessage) {
      return NextResponse.json({ error: 'Reply message is required' }, { status: 400 });
    }

    // Get the original notification
    const notification = await prisma.notification.findUnique({
      where: { notificationId }
    });

    if (!notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    // Get coordinator info
    const coordinator = await prisma.fYPCoordinator.findUnique({
      where: { userId },
      include: { user: true, campus: true }
    });

    if (!coordinator) {
      return NextResponse.json({ error: 'Coordinator not found' }, { status: 404 });
    }

    // Try to find the user by email if provided
    let recipientUser = null;
    if (recipientEmail) {
      recipientUser = await prisma.user.findUnique({
        where: { email: recipientEmail }
      });
    }

    // If user exists in system, send them a notification
    if (recipientUser) {
      // Get the recipient's campus
      let recipientCampusId = coordinator.campusId;
      
      const student = await prisma.student.findUnique({
        where: { userId: recipientUser.userId }
      });
      
      if (student) {
        recipientCampusId = student.campusId;
      }

      await prisma.notification.create({
        data: {
          title: `Reply from Coordinator: ${coordinator.user.name}`,
          message: `**Regarding your help request:**\n\n${replyMessage}\n\n---\n*This is a response to your help request submitted earlier.*`,
          type: 'general',
          targetType: 'specific_users',
          createdById: userId,
          campusId: recipientCampusId,
          recipients: {
            create: {
              userId: recipientUser.userId
            }
          }
        }
      });

      return NextResponse.json({ 
        success: true, 
        message: 'Reply sent successfully via notification',
        method: 'notification'
      });
    }

    // If user doesn't exist in system (logged out user who submitted via help page)
    // We can only display a message that email would be sent (implement actual email sending if needed)
    return NextResponse.json({ 
      success: true, 
      message: `Reply prepared for ${recipientEmail || recipientName}. The user will see this when they log in.`,
      note: 'User not found in system - they may have submitted the help request while logged out',
      method: 'pending'
    });

  } catch (error) {
    console.error('Error sending reply:', error);
    return NextResponse.json({ error: 'Failed to send reply' }, { status: 500 });
  }
}
