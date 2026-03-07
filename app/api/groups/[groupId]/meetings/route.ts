import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { scheduleMeetingReminders, rescheduleMeetingReminders } from '@/lib/meeting-scheduler';

// GET - Get all meetings for a group
export async function GET(
  req: NextRequest,
  { params }: { params: { groupId: string } }
) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const groupId = parseInt(params.groupId);

    // Verify user has access to this group
    const group = await prisma.group.findUnique({
      where: { groupId },
      include: {
        students: {
          include: { user: true }
        }
      }
    });

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    const userId = parseInt(session.user.id);
    const isSupervisor = group.supervisorId === userId;
    const isStudent = group.students.some(s => s.userId === userId);

    if (!isSupervisor && !isStudent) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const meetings = await prisma.meeting.findMany({
      where: { groupId },
      orderBy: { scheduledAt: 'desc' }
    });

    // Get creator info for each meeting
    const meetingsWithCreator = await Promise.all(
      meetings.map(async (meeting) => {
        const creator = await prisma.user.findUnique({
          where: { userId: meeting.createdById },
          select: { userId: true, name: true, profileImage: true }
        });
        return { ...meeting, creator };
      })
    );

    return NextResponse.json({ meetings: meetingsWithCreator });
  } catch (error) {
    console.error('Error fetching meetings:', error);
    return NextResponse.json({ error: 'Failed to fetch meetings' }, { status: 500 });
  }
}

// POST - Create a new meeting
export async function POST(
  req: NextRequest,
  { params }: { params: { groupId: string } }
) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const groupId = parseInt(params.groupId);
    const body = await req.json();
    const { title, description, meetingLink, scheduledAt, duration } = body;

    if (!title || !scheduledAt) {
      return NextResponse.json({ error: 'Title and scheduled time are required' }, { status: 400 });
    }

    // Verify user has access to this group
    const group = await prisma.group.findUnique({
      where: { groupId },
      include: {
        students: {
          include: { user: true }
        }
      }
    });

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    const userId = parseInt(session.user.id);
    const isSupervisor = group.supervisorId === userId;
    const isStudent = group.students.some(s => s.userId === userId);

    if (!isSupervisor && !isStudent) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const meeting = await prisma.meeting.create({
      data: {
        groupId,
        title,
        description,
        meetingLink,
        scheduledAt: new Date(scheduledAt),
        duration: duration || 60,
        createdById: userId,
        createdByRole: isSupervisor ? 'supervisor' : 'student'
      }
    });

    // Schedule email reminders (immediate + 24h before + 1h before)
    scheduleMeetingReminders(meeting.meetingId, meeting.scheduledAt).catch((err) =>
      console.error('Failed to schedule meeting reminders:', err)
    );

    return NextResponse.json({ meeting }, { status: 201 });
  } catch (error) {
    console.error('Error creating meeting:', error);
    return NextResponse.json({ error: 'Failed to create meeting' }, { status: 500 });
  }
}

// PATCH - Update a meeting
export async function PATCH(
  req: NextRequest,
  { params }: { params: { groupId: string } }
) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const groupId = parseInt(params.groupId);
    const body = await req.json();
    const { meetingId, title, description, meetingLink, scheduledAt, duration, status } = body;

    if (!meetingId) {
      return NextResponse.json({ error: 'Meeting ID is required' }, { status: 400 });
    }

    // Verify meeting exists and belongs to group
    const meeting = await prisma.meeting.findFirst({
      where: { meetingId, groupId }
    });

    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    }

    const userId = parseInt(session.user.id);

    // Only creator or supervisor can update
    const group = await prisma.group.findUnique({ where: { groupId } });
    const isSupervisor = group?.supervisorId === userId;
    const isCreator = meeting.createdById === userId;

    if (!isSupervisor && !isCreator) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const updateData: any = { updatedAt: new Date() };
    if (title) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (meetingLink !== undefined) updateData.meetingLink = meetingLink;
    if (scheduledAt) updateData.scheduledAt = new Date(scheduledAt);
    if (duration) updateData.duration = duration;
    if (status) updateData.status = status;

    const updated = await prisma.meeting.update({
      where: { meetingId },
      data: updateData
    });

    // If scheduledAt changed, reschedule the timed reminders
    if (scheduledAt) {
      rescheduleMeetingReminders(meetingId, new Date(scheduledAt)).catch((err) =>
        console.error('Failed to reschedule meeting reminders:', err)
      );
    }

    return NextResponse.json({ meeting: updated });
  } catch (error) {
    console.error('Error updating meeting:', error);
    return NextResponse.json({ error: 'Failed to update meeting' }, { status: 500 });
  }
}

// DELETE - Delete a meeting
export async function DELETE(
  req: NextRequest,
  { params }: { params: { groupId: string } }
) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const groupId = parseInt(params.groupId);
    const { searchParams } = new URL(req.url);
    const meetingId = parseInt(searchParams.get('meetingId') || '0');

    if (!meetingId) {
      return NextResponse.json({ error: 'Meeting ID is required' }, { status: 400 });
    }

    // Verify meeting exists and belongs to group
    const meeting = await prisma.meeting.findFirst({
      where: { meetingId, groupId }
    });

    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    }

    const userId = parseInt(session.user.id);

    // Only creator or supervisor can delete
    const group = await prisma.group.findUnique({ where: { groupId } });
    const isSupervisor = group?.supervisorId === userId;
    const isCreator = meeting.createdById === userId;

    if (!isSupervisor && !isCreator) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await prisma.meeting.delete({ where: { meetingId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting meeting:', error);
    return NextResponse.json({ error: 'Failed to delete meeting' }, { status: 500 });
  }
}
