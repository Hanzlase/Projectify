import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);

    // Get student with their group
    const student = await prisma.student.findUnique({
      where: { userId },
      include: {
        group: true
      }
    });

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // If student doesn't have a group, return empty arrays
    if (!student.groupId) {
      return NextResponse.json({ 
        tasks: [], 
        meetings: [],
        upcomingMeetings: []
      });
    }

    const groupId = student.groupId;
    const now = new Date();

    // Fetch tasks and meetings in parallel
    const [tasks, meetings] = await Promise.all([
      // Get all tasks for the group, prioritizing those assigned to the user
      prisma.projectTask.findMany({
        where: { 
          groupId,
          parentId: null // Only main tasks, not subtasks
        },
        orderBy: [
          { dueDate: 'asc' },
          { priority: 'desc' },
          { createdAt: 'desc' }
        ],
        take: 10
      }),
      // Get all meetings for the group
      prisma.meeting.findMany({
        where: { groupId },
        orderBy: { scheduledAt: 'asc' }
      })
    ]);

    // Get assignee info for tasks
    const tasksWithAssignee = await Promise.all(
      tasks.map(async (task) => {
        const assignee = task.assignedTo 
          ? await prisma.user.findUnique({
              where: { userId: task.assignedTo },
              select: { userId: true, name: true, profileImage: true }
            })
          : null;
        
        return {
          taskId: task.taskId,
          title: task.title,
          description: task.description,
          status: task.status,
          priority: task.priority,
          dueDate: task.dueDate,
          assignedTo: task.assignedTo,
          assignee,
          isAssignedToMe: task.assignedTo === userId
        };
      })
    );

    // Get creator info for meetings
    const meetingsWithCreator = await Promise.all(
      meetings.map(async (meeting) => {
        const creator = await prisma.user.findUnique({
          where: { userId: meeting.createdById },
          select: { userId: true, name: true, profileImage: true }
        });
        
        return {
          meetingId: meeting.meetingId,
          title: meeting.title,
          description: meeting.description,
          meetingLink: meeting.meetingLink,
          scheduledAt: meeting.scheduledAt,
          duration: meeting.duration,
          status: meeting.status,
          creator
        };
      })
    );

    // Filter upcoming meetings (scheduled and in the future or today)
    const upcomingMeetings = meetingsWithCreator.filter(m => {
      const meetingDate = new Date(m.scheduledAt);
      return m.status === 'scheduled' && meetingDate >= new Date(now.setHours(0, 0, 0, 0));
    }).slice(0, 3);

    // Sort tasks: my tasks first, then by due date
    const sortedTasks = tasksWithAssignee.sort((a, b) => {
      // First, prioritize tasks assigned to the user
      if (a.isAssignedToMe && !b.isAssignedToMe) return -1;
      if (!a.isAssignedToMe && b.isAssignedToMe) return 1;
      
      // Then sort by status (pending first, then in_progress, then completed)
      const statusOrder = { pending: 0, in_progress: 1, completed: 2 };
      const statusDiff = statusOrder[a.status as keyof typeof statusOrder] - statusOrder[b.status as keyof typeof statusOrder];
      if (statusDiff !== 0) return statusDiff;
      
      // Then by due date
      if (a.dueDate && b.dueDate) {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      
      return 0;
    });

    return NextResponse.json({
      tasks: sortedTasks,
      meetings: meetingsWithCreator,
      upcomingMeetings
    });
  } catch (error) {
    console.error('Error fetching dashboard tasks and meetings:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}
