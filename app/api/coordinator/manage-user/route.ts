import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Update user details
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session || session.user.role !== 'coordinator') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { userId, name, email, rollNumber, specialization } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Get coordinator's campus
    const coordinator = await prisma.fYPCoordinator.findFirst({
      where: { userId: parseInt(session.user.id) },
    });

    if (!coordinator) {
      return NextResponse.json({ error: 'Coordinator not found' }, { status: 404 });
    }

    // Get user to update
    const user = await prisma.user.findUnique({
      where: { userId: parseInt(userId) },
      include: {
        student: true,
        supervisor: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify user belongs to coordinator's campus
    const userCampusId = user.student?.campusId || user.supervisor?.campusId;
    if (userCampusId !== coordinator.campusId) {
      return NextResponse.json({ error: 'User does not belong to your campus' }, { status: 403 });
    }

    // Check if email is being changed and if it's already taken
    if (email && email !== user.email) {
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });
      if (existingUser) {
        return NextResponse.json({ error: 'Email already in use' }, { status: 400 });
      }
    }

    // Update user
    const updateData: any = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;

    await prisma.user.update({
      where: { userId: parseInt(userId) },
      data: updateData,
    });

    // Update role-specific data
    if (user.role === 'student' && rollNumber) {
      // Check if roll number is already taken
      const existingStudent = await prisma.student.findUnique({
        where: { rollNumber },
      });
      if (existingStudent && existingStudent.userId !== user.userId) {
        return NextResponse.json({ error: 'Roll number already in use' }, { status: 400 });
      }
      await prisma.student.update({
        where: { userId: parseInt(userId) },
        data: { rollNumber },
      });
    }

    if (user.role === 'supervisor' && specialization) {
      await prisma.fYPSupervisor.update({
        where: { userId: parseInt(userId) },
        data: { specialization },
      });
    }

    return NextResponse.json({ message: 'User updated successfully' });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

// Suspend or unsuspend user
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session || session.user.role !== 'coordinator') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { userId, action } = body;

    if (!userId || !action) {
      return NextResponse.json({ error: 'User ID and action are required' }, { status: 400 });
    }

    if (!['suspend', 'activate', 'remove'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Get coordinator's campus
    const coordinator = await prisma.fYPCoordinator.findFirst({
      where: { userId: parseInt(session.user.id) },
    });

    if (!coordinator) {
      return NextResponse.json({ error: 'Coordinator not found' }, { status: 404 });
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { userId: parseInt(userId) },
      include: {
        student: true,
        supervisor: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify user belongs to coordinator's campus
    const userCampusId = user.student?.campusId || user.supervisor?.campusId;
    if (userCampusId !== coordinator.campusId) {
      return NextResponse.json({ error: 'User does not belong to your campus' }, { status: 403 });
    }

    // Can't suspend/remove coordinators
    if (user.role === 'coordinator') {
      return NextResponse.json({ error: 'Cannot modify coordinator accounts' }, { status: 403 });
    }

    let newStatus: 'ACTIVE' | 'SUSPENDED' | 'REMOVED';
    switch (action) {
      case 'suspend':
        newStatus = 'SUSPENDED';
        break;
      case 'activate':
        newStatus = 'ACTIVE';
        break;
      case 'remove':
        newStatus = 'REMOVED';
        break;
      default:
        newStatus = 'ACTIVE';
    }

    await (prisma.user.update as any)({
      where: { userId: parseInt(userId) },
      data: { status: newStatus },
    });

    return NextResponse.json({ 
      message: `User ${action === 'suspend' ? 'suspended' : action === 'activate' ? 'activated' : 'removed'} successfully` 
    });
  } catch (error) {
    console.error('Error updating user status:', error);
    return NextResponse.json({ error: 'Failed to update user status' }, { status: 500 });
  }
}

// Permanently delete user
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session || session.user.role !== 'coordinator') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Get coordinator's campus
    const coordinator = await prisma.fYPCoordinator.findFirst({
      where: { userId: parseInt(session.user.id) },
    });

    if (!coordinator) {
      return NextResponse.json({ error: 'Coordinator not found' }, { status: 404 });
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { userId: parseInt(userId) },
      include: {
        student: true,
        supervisor: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify user belongs to coordinator's campus
    const userCampusId = user.student?.campusId || user.supervisor?.campusId;
    if (userCampusId !== coordinator.campusId) {
      return NextResponse.json({ error: 'User does not belong to your campus' }, { status: 403 });
    }

    // Can't delete coordinators
    if (user.role === 'coordinator') {
      return NextResponse.json({ error: 'Cannot delete coordinator accounts' }, { status: 403 });
    }

    // Delete user (cascade will handle related records)
    await prisma.user.delete({
      where: { userId: parseInt(userId) },
    });

    return NextResponse.json({ message: 'User deleted permanently' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
