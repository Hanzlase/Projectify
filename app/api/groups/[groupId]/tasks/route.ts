import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

// GET - Get all tasks for a group
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

    const tasks = await prisma.projectTask.findMany({
      where: { groupId },
      orderBy: [
        { status: 'asc' },
        { priority: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    // Get assignee and creator info for each task
    const tasksWithUsers = await Promise.all(
      tasks.map(async (task) => {
        const assignee = task.assignedTo 
          ? await prisma.user.findUnique({
              where: { userId: task.assignedTo },
              select: { userId: true, name: true, profileImage: true }
            })
          : null;
        const creator = await prisma.user.findUnique({
          where: { userId: task.createdById },
          select: { userId: true, name: true, profileImage: true }
        });
        
        // Determine if creator is a supervisor
        const createdByRole = task.createdById === group.supervisorId ? 'supervisor' : 'student';
        
        return { ...task, assignee, creator, createdByRole };
      })
    );

    // Organize tasks with subtasks
    const mainTasks = tasksWithUsers.filter(t => !t.parentId);
    const subtasks = tasksWithUsers.filter(t => t.parentId);
    
    const organizedTasks = mainTasks.map(task => ({
      ...task,
      subtasks: subtasks.filter(st => st.parentId === task.taskId)
    }));

    return NextResponse.json({ tasks: organizedTasks });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }
}

// POST - Create a new task
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
    const { title, description, assignedTo, parentId, priority, dueDate } = body;

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
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

    // If parentId is provided, verify it exists
    if (parentId) {
      const parentTask = await prisma.projectTask.findFirst({
        where: { taskId: parentId, groupId }
      });
      if (!parentTask) {
        return NextResponse.json({ error: 'Parent task not found' }, { status: 404 });
      }
    }

    const task = await prisma.projectTask.create({
      data: {
        groupId,
        title,
        description,
        assignedTo: assignedTo ? parseInt(assignedTo) : null,
        parentId: parentId ? parseInt(parentId) : null,
        priority: priority || 'medium',
        dueDate: dueDate ? new Date(dueDate) : null,
        createdById: userId
      }
    });

    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    console.error('Error creating task:', error);
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}

// PATCH - Update a task
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
    const { taskId, title, description, assignedTo, status, priority, dueDate } = body;

    if (!taskId) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }

    // Verify task exists and belongs to group
    const task = await prisma.projectTask.findFirst({
      where: { taskId, groupId }
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
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

    const updateData: any = { updatedAt: new Date() };
    if (title) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (assignedTo !== undefined) updateData.assignedTo = assignedTo ? parseInt(assignedTo) : null;
    if (status) {
      updateData.status = status;
      if (status === 'completed') {
        updateData.completedAt = new Date();
      } else {
        updateData.completedAt = null;
      }
    }
    if (priority) updateData.priority = priority;
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;

    const updated = await prisma.projectTask.update({
      where: { taskId },
      data: updateData
    });

    return NextResponse.json({ task: updated });
  } catch (error) {
    console.error('Error updating task:', error);
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
  }
}

// DELETE - Delete a task
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
    const taskId = parseInt(searchParams.get('taskId') || '0');

    if (!taskId) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }

    // Verify task exists and belongs to group
    const task = await prisma.projectTask.findFirst({
      where: { taskId, groupId }
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
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
    const isCreator = task.createdById === userId;

    // Only supervisor, creator, or group members can delete
    if (!isSupervisor && !isStudent) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Check if task was created by a supervisor
    const creatorIsSupervisor = task.createdById === group.supervisorId;
    
    // Students cannot delete tasks created by supervisors
    if (isStudent && !isSupervisor && creatorIsSupervisor) {
      return NextResponse.json({ 
        error: 'Students cannot delete tasks created by supervisors' 
      }, { status: 403 });
    }

    // Delete subtasks first
    await prisma.projectTask.deleteMany({
      where: { parentId: taskId }
    });

    // Delete the task
    await prisma.projectTask.delete({ where: { taskId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting task:', error);
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
  }
}
