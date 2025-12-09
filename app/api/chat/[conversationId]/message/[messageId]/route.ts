import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

// DELETE - Delete a message
export async function DELETE(
  request: NextRequest,
  { params }: { params: { conversationId: string; messageId: string } }
) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const conversationId = parseInt(params.conversationId);
    const messageId = parseInt(params.messageId);

    // Check if user is part of this conversation
    const participant = await (prisma as any).conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId
        }
      }
    });

    if (!participant) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get the message
    const message = await (prisma as any).message.findUnique({
      where: {
        messageId
      }
    });

    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    // Check if the user is the sender of the message
    if (message.senderId !== userId) {
      return NextResponse.json({ error: 'You can only delete your own messages' }, { status: 403 });
    }

    // Delete the message
    await (prisma as any).message.delete({
      where: {
        messageId
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete message error:', error);
    return NextResponse.json({ error: 'Failed to delete message' }, { status: 500 });
  }
}
