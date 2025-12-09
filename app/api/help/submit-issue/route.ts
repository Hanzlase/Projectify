import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const { name, email, rollNumber, issueType, message } = await request.json();

    if (!name || !email || !message || !issueType) {
      return NextResponse.json(
        { error: 'Name, email, issue type, and message are required' },
        { status: 400 }
      );
    }

    // Get all coordinators to send them the notification
    const coordinators = await prisma.fYPCoordinator.findMany({
      include: {
        user: true,
        campus: true,
      },
    });

    if (coordinators.length === 0) {
      return NextResponse.json(
        { error: 'No coordinators found to receive your request' },
        { status: 404 }
      );
    }

    // Format the issue type for display
    const issueTypeLabels: Record<string, string> = {
      login: 'Cannot Login',
      password: 'Password Issue',
      account: 'Account Problem',
      other: 'Other Issue',
    };

    const issueLabel = issueTypeLabels[issueType] || issueType;

    // Create notification title and message
    const notificationTitle = `Help Request: ${issueLabel}`;
    const notificationMessage = `
**From:** ${name}
**Email:** ${email}
${rollNumber ? `**Roll Number:** ${rollNumber}` : ''}
**Issue Type:** ${issueLabel}

**Message:**
${message}
    `.trim();

    // Create notifications for all coordinators
    // We'll create one notification per coordinator since they might be on different campuses
    for (const coordinator of coordinators) {
      // Create the notification
      // Note: createdById is set to the coordinator's ID temporarily until schema migration is done
      // After running `npx prisma db push`, this can be removed so help requests only show in inbox
      const notification = await prisma.notification.create({
        data: {
          title: notificationTitle,
          message: notificationMessage,
          type: 'urgent',
          targetType: 'specific_users',
          createdById: 0, // Use 0 to indicate system-generated (after migration, this field can be null)
          campusId: coordinator.campusId,
          recipients: {
            create: {
              userId: coordinator.userId,
            },
          },
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Your issue has been submitted to the coordinators',
    });

  } catch (error) {
    console.error('Help request error:', error);
    return NextResponse.json(
      { error: 'Failed to submit issue. Please try again.' },
      { status: 500 }
    );
  }
}
