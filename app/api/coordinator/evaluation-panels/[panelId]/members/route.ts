import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// DELETE - Remove a member from evaluation panel
export async function DELETE(
  request: NextRequest,
  { params }: { params: { panelId: string } }
) {
  try {
    const session = await auth();
    
    if (!session?.user || session.user.role !== 'coordinator') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const panelId = parseInt(params.panelId);
    const body = await request.json();
    const { supervisorId } = body;

    if (!supervisorId) {
      return NextResponse.json({ error: 'Supervisor ID required' }, { status: 400 });
    }

    // Check if panel exists and belongs to coordinator's campus
    const userId = parseInt(session.user.id);
    const coordinator = await prisma.fYPCoordinator.findUnique({
      where: { userId },
      select: { campusId: true }
    });

    if (!coordinator) {
      return NextResponse.json({ error: 'Coordinator not found' }, { status: 404 });
    }

    const panel = await prisma.evaluationPanel.findFirst({
      where: {
        panelId,
        campusId: coordinator.campusId
      }
    });

    if (!panel) {
      return NextResponse.json({ error: 'Panel not found' }, { status: 404 });
    }

    // Delete the panel member
    await prisma.panelMember.deleteMany({
      where: {
        panelId,
        supervisorId: parseInt(supervisorId)
      }
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error removing panel member:', error);
    return NextResponse.json({ error: 'Failed to remove panel member' }, { status: 500 });
  }
}
