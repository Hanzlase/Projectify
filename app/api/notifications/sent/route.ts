import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

// GET - Fetch all sent notifications by the coordinator
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (session.user.role !== 'coordinator') {
      return NextResponse.json({ error: 'Only coordinators can view sent notifications' }, { status: 403 });
    }

    const userId = parseInt(session.user.id);

    // Get all notifications created by this coordinator
    const notifications = await prisma.notification.findMany({
      where: {
        createdById: userId
      },
      include: {
        recipients: {
          select: {
            isRead: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({
      notifications: notifications.map((n: any) => ({
        id: n.notificationId,
        title: n.title,
        message: n.message,
        type: n.type,
        targetType: n.targetType,
        recipientCount: n.recipients.length,
        readCount: n.recipients.filter((r: any) => r.isRead).length,
        createdAt: n.createdAt
      }))
    });
  } catch (error) {
    console.error('Error fetching sent notifications:', error);
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
  }
}
