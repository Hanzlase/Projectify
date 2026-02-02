import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

// PATCH - Update coordinator (suspend/activate/update)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const userId = parseInt(params.userId);
    const body = await req.json();
    const { action, name, email, campusId } = body;

    // Get the coordinator
    const coordinator = await (prisma as any).users.findUnique({
      where: { user_id: userId },
      include: {
        fyp_coordinators: true,
      },
    });

    if (!coordinator || coordinator.role !== 'coordinator') {
      return NextResponse.json({ error: 'Coordinator not found' }, { status: 404 });
    }

    // Handle different actions
    if (action === 'suspend') {
      await (prisma as any).users.update({
        where: { user_id: userId },
        data: { status: 'SUSPENDED', updatedAt: new Date() },
      });
      return NextResponse.json({ success: true, message: 'Coordinator suspended' });
    }

    if (action === 'activate') {
      await (prisma as any).users.update({
        where: { user_id: userId },
        data: { status: 'ACTIVE', updatedAt: new Date() },
      });
      return NextResponse.json({ success: true, message: 'Coordinator activated' });
    }

    // Update coordinator details
    const updateData: any = { updatedAt: new Date() };
    if (name) updateData.name = name;
    if (email) {
      // Check if email is taken by another user
      const existingUser = await (prisma as any).users.findFirst({
        where: {
          email,
          user_id: { not: userId },
        },
      });
      if (existingUser) {
        return NextResponse.json({ error: 'Email already in use' }, { status: 400 });
      }
      updateData.email = email;
    }

    // Update user
    const updatedUser = await (prisma as any).users.update({
      where: { user_id: userId },
      data: updateData,
    });

    // Update campus if provided
    if (campusId && coordinator.fyp_coordinators) {
      // Check campus max coordinators
      const campus = await (prisma as any).campuses.findUnique({
        where: { campus_id: parseInt(campusId) },
        include: {
          fyp_coordinators: {
            include: {
              users: true,
            },
          },
        },
      });

      if (!campus) {
        return NextResponse.json({ error: 'Campus not found' }, { status: 404 });
      }

      // Check if changing campus and if max reached
      if (coordinator.fyp_coordinators.campus_id !== parseInt(campusId)) {
        const activeCoordinators = campus.fyp_coordinators.filter(
          (c: any) => c.users.status !== 'REMOVED'
        );
        if (activeCoordinators.length >= (campus.max_coordinators || 5)) {
          return NextResponse.json({ 
            error: `Maximum coordinators (${campus.max_coordinators || 5}) reached for this campus` 
          }, { status: 400 });
        }
      }

      await (prisma as any).fyp_coordinators.update({
        where: { coordinator_id: coordinator.fyp_coordinators.coordinator_id },
        data: { campus_id: parseInt(campusId), updatedAt: new Date() },
      });
    }

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error('Error updating coordinator:', error);
    return NextResponse.json({ error: 'Failed to update coordinator' }, { status: 500 });
  }
}

// DELETE - Remove coordinator
export async function DELETE(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const userId = parseInt(params.userId);

    // Get the coordinator
    const coordinator = await (prisma as any).users.findUnique({
      where: { user_id: userId },
    });

    if (!coordinator || coordinator.role !== 'coordinator') {
      return NextResponse.json({ error: 'Coordinator not found' }, { status: 404 });
    }

    // Soft delete - mark as REMOVED
    await (prisma as any).users.update({
      where: { user_id: userId },
      data: { status: 'REMOVED', updatedAt: new Date() },
    });

    return NextResponse.json({ success: true, message: 'Coordinator removed' });
  } catch (error) {
    console.error('Error deleting coordinator:', error);
    return NextResponse.json({ error: 'Failed to delete coordinator' }, { status: 500 });
  }
}
