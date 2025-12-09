import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

// DELETE - Cancel a pending invitation
export async function DELETE(
  req: NextRequest,
  { params }: { params: { groupId: string } }
) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const groupId = parseInt(params.groupId);
    const body = await req.json();
    const { inviteeId } = body;

    if (!inviteeId) {
      return NextResponse.json({ error: 'Invitee ID is required' }, { status: 400 });
    }

    // Get the group
    const group = await (prisma as any).group.findUnique({
      where: { groupId },
      include: { students: true }
    });

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    // Check if user is admin
    const student = await (prisma as any).student.findUnique({ where: { userId } });
    const isCreator = student && group.createdById === student.studentId;
    const isSupervisor = group.supervisorId === userId;
    const isStudentAdmin = student?.groupId === groupId && student?.isGroupAdmin;

    if (!isCreator && !isSupervisor && !isStudentAdmin) {
      return NextResponse.json({ error: 'Only group admins can cancel invitations' }, { status: 403 });
    }

    // Find and delete the invitation
    const invitation = await (prisma as any).groupInvitation.findFirst({
      where: {
        groupId,
        inviteeId: parseInt(inviteeId),
        status: 'pending'
      }
    });

    if (!invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

    await (prisma as any).groupInvitation.delete({
      where: { id: invitation.id }
    });

    return NextResponse.json({ success: true, message: 'Invitation cancelled' });

  } catch (error) {
    console.error('Error cancelling invitation:', error);
    return NextResponse.json({ error: 'Failed to cancel invitation' }, { status: 500 });
  }
}
