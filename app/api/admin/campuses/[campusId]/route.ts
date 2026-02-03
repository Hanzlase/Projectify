import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

// PATCH - Update campus (name, location, max coordinators)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { campusId: string } }
) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const campusId = parseInt(params.campusId);
    const body = await req.json();
    const { name, location, maxCoordinators } = body;

    // Check if campus exists
    const campus = await prisma.campus.findUnique({
      where: { campusId },
    });

    if (!campus) {
      return NextResponse.json({ error: 'Campus not found' }, { status: 404 });
    }

    // Check if new name conflicts with another campus
    if (name && name !== campus.name) {
      const existingCampus = await prisma.campus.findFirst({
        where: {
          name,
          campusId: { not: campusId },
        },
      });

      if (existingCampus) {
        return NextResponse.json({ error: 'Campus name already exists' }, { status: 400 });
      }
    }

    // Build update data
    const updateData: any = { updatedAt: new Date() };
    if (name) updateData.name = name;
    if (location !== undefined) updateData.location = location;
    if (maxCoordinators !== undefined) updateData.maxCoordinators = maxCoordinators;

    const updatedCampus = await prisma.campus.update({
      where: { campusId },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      campus: {
        campusId: updatedCampus.campusId,
        name: updatedCampus.name,
        location: updatedCampus.location,
        maxCoordinators: updatedCampus.maxCoordinators || 5,
      },
    });
  } catch (error) {
    console.error('Error updating campus:', error);
    return NextResponse.json({ error: 'Failed to update campus' }, { status: 500 });
  }
}

// DELETE - Delete campus (only if no users assigned)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { campusId: string } }
) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const campusId = parseInt(params.campusId);

    // Check if campus exists and has any users
    const campus = await prisma.campus.findUnique({
      where: { campusId },
      include: {
        _count: {
          select: {
            coordinators: true,
            supervisors: true,
            students: true,
          },
        },
      },
    });

    if (!campus) {
      return NextResponse.json({ error: 'Campus not found' }, { status: 404 });
    }

    const totalUsers = campus._count.coordinators + campus._count.supervisors + campus._count.students;
    if (totalUsers > 0) {
      return NextResponse.json({ 
        error: `Cannot delete campus with ${totalUsers} users. Remove all users first.` 
      }, { status: 400 });
    }

    await prisma.campus.delete({
      where: { campusId },
    });

    return NextResponse.json({ success: true, message: 'Campus deleted' });
  } catch (error) {
    console.error('Error deleting campus:', error);
    return NextResponse.json({ error: 'Failed to delete campus' }, { status: 500 });
  }
}
