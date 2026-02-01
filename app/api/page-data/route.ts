import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Combined API endpoint to reduce multiple round trips
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const { searchParams } = new URL(request.url);
    const include = searchParams.get('include')?.split(',') || [];

    const result: Record<string, any> = {};

    // Fetch requested data in parallel
    const promises: Promise<void>[] = [];

    if (include.includes('profile')) {
      promises.push(
        prisma.user.findUnique({
          where: { userId },
          select: {
            userId: true,
            email: true,
            role: true,
            profileImage: true,
          }
        }).then((data: any) => { result.profile = data; })
      );
    }

    if (include.includes('notifications')) {
      promises.push(
        Promise.all([
          prisma.notificationRecipient.findMany({
            where: { userId, isRead: false },
            take: 10,
            orderBy: { notification: { createdAt: 'desc' } },
            include: {
              notification: {
                select: {
                  notificationId: true,
                  title: true,
                  message: true,
                  type: true,
                  createdAt: true,
                }
              }
            }
          }),
          prisma.notificationRecipient.count({
            where: { userId, isRead: false }
          })
        ]).then(([notifications, unreadCount]) => {
          result.notifications = notifications;
          result.unreadCount = unreadCount;
        })
      );
    }

    await Promise.all(promises);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Page data API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
