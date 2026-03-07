import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { emitInvitationUpdated } from '@/lib/socket-emitters';

// PATCH - Update invitation status (accept/reject)
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const invitationId = parseInt(params.id);
    const body = await request.json();
    const { status } = body;

    if (!['accepted', 'rejected', 'cancelled'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // Get the student record for the current user
    const student = await prisma.student.findUnique({
      where: { userId }
    });

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Get the invitation
    const invitation = await prisma.invitation.findUnique({
      where: { invitationId },
      include: {
        sender: true,
        receiver: true
      }
    });

    if (!invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

    // Check authorization
    // Receiver can accept/reject, Sender can cancel
    if (status === 'cancelled') {
      if (invitation.senderId !== student.studentId) {
        return NextResponse.json({ error: 'Not authorized to cancel this invitation' }, { status: 403 });
      }
    } else {
      if (invitation.receiverId !== student.studentId) {
        return NextResponse.json({ error: 'Not authorized to respond to this invitation' }, { status: 403 });
      }
    }

    // Update invitation status
    const updatedInvitation = await prisma.invitation.update({
      where: { invitationId },
      data: { status },
      include: {
        sender: { include: { user: { select: { userId: true, name: true } } } },
        receiver: { include: { user: { select: { userId: true } } } }
      }
    });

    // Emit real-time event to both sender and receiver
    try {
      const eventPayload = {
        invitationId: updatedInvitation.invitationId,
        type: 'student_invite' as const,
        status: status as 'pending' | 'accepted' | 'rejected' | 'cancelled',
        senderId: updatedInvitation.sender.userId,
        receiverId: updatedInvitation.receiver.userId,
        senderName: updatedInvitation.sender.user.name,
        createdAt: updatedInvitation.createdAt.toISOString(),
      };
      // Notify both parties so each side updates without a refresh
      emitInvitationUpdated(updatedInvitation.sender.userId, eventPayload);
      emitInvitationUpdated(updatedInvitation.receiver.userId, eventPayload);
    } catch (socketError) {
      // Non-fatal
    }

    return NextResponse.json({
      success: true,
      invitation: {
        id: updatedInvitation.invitationId,
        status: updatedInvitation.status
      }
    });
  } catch (error) {
    console.error('Update invitation error:', error);
    return NextResponse.json(
      { error: 'Failed to update invitation' },
      { status: 500 }
    );
  }
}

// DELETE - Delete an invitation
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const invitationId = parseInt(params.id);

    // Get the student record for the current user
    const student = await prisma.student.findUnique({
      where: { userId }
    });

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Get the invitation
    const invitation = await prisma.invitation.findUnique({
      where: { invitationId }
    });

    if (!invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

    // Check authorization - only sender can delete
    if (invitation.senderId !== student.studentId) {
      return NextResponse.json({ error: 'Not authorized to delete this invitation' }, { status: 403 });
    }

    await prisma.invitation.delete({
      where: { invitationId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete invitation error:', error);
    return NextResponse.json(
      { error: 'Failed to delete invitation' },
      { status: 500 }
    );
  }
}
