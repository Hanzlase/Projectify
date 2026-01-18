import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { encryptMessage, decryptMessage } from '@/lib/encryption';
import { emitChatMessage, emitMessageDeleted } from '@/lib/socket-emitters';

// GET - Get messages for a conversation
export async function GET(
  request: NextRequest,
  { params }: { params: { conversationId: string } }
) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const conversationId = parseInt(params.conversationId);

    // Check if user is part of this conversation
    let participant = await (prisma as any).conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId
        }
      }
    });

    // If not a direct participant, check if user is a supervisor of this group chat
    if (!participant) {
      const groupChat = await (prisma as any).groupChat.findUnique({
        where: { conversationId },
        include: {
          group: true
        }
      });

      if (groupChat && groupChat.group.supervisorId === userId) {
        // Supervisor is authorized - add them as a participant for future access
        participant = await (prisma as any).conversationParticipant.create({
          data: {
            conversationId,
            userId
          }
        });
      }
    }

    if (!participant) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get messages with sender info in a single query using raw SQL for better performance
    const messages = await (prisma as any).message.findMany({
      where: {
        conversationId
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    // Get sender details for all messages in a single query
    const senderIds: number[] = Array.from(new Set(messages.map((m: any) => m.senderId)));
    const senders = await (prisma as any).user.findMany({
      where: {
        userId: { in: senderIds }
      },
      select: {
        userId: true,
        name: true,
        profileImage: true,
        role: true
      }
    });

    const senderMap = new Map(senders.map((s: any) => [s.userId, s]));

    const messagesWithSender = messages.map((msg: any) => ({
      ...msg,
      content: decryptMessage(msg.content), // Decrypt message content
      sender: senderMap.get(msg.senderId) || null,
      isOwn: msg.senderId === userId
    }));

    // Mark messages as read and update timestamp in parallel
    await Promise.all([
      (prisma as any).message.updateMany({
        where: {
          conversationId,
          senderId: { not: userId },
          isRead: false
        },
        data: {
          isRead: true
        }
      }),
      (prisma as any).conversationParticipant.update({
        where: {
          conversationId_userId: {
            conversationId,
            userId
          }
        },
        data: {
          lastReadAt: new Date()
        }
      })
    ]);

    // Get the other participant with user info in a single query
    const otherParticipants = await (prisma as any).conversationParticipant.findMany({
      where: {
        conversationId,
        userId: { not: userId }
      }
    });

    let otherUser = null;
    if (otherParticipants.length > 0) {
      otherUser = await (prisma as any).user.findUnique({
        where: { userId: otherParticipants[0].userId },
        select: {
          userId: true,
          name: true,
          email: true,
          role: true,
          profileImage: true
        }
      });
    }

    return NextResponse.json({
      messages: messagesWithSender,
      otherUser
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}

// POST - Send a message
export async function POST(
  request: NextRequest,
  { params }: { params: { conversationId: string } }
) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const conversationId = parseInt(params.conversationId);
    const { content, attachmentUrl, attachmentType, attachmentName } = await request.json();

    // Either content or attachment is required
    if ((!content || content.trim() === '') && !attachmentUrl) {
      return NextResponse.json({ error: 'Message content or attachment is required' }, { status: 400 });
    }

    // Check if user is part of this conversation
    let participant = await (prisma as any).conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId
        }
      }
    });

    // If not a direct participant, check if user is a supervisor of this group chat
    if (!participant) {
      const groupChat = await (prisma as any).groupChat.findUnique({
        where: { conversationId },
        include: {
          group: true
        }
      });

      if (groupChat && groupChat.group.supervisorId === userId) {
        // Supervisor is authorized - add them as a participant for future access
        participant = await (prisma as any).conversationParticipant.create({
          data: {
            conversationId,
            userId
          }
        });
      }
    }

    if (!participant) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Create message with optional attachment
    const messageData: any = {
      conversationId,
      senderId: userId,
      content: content?.trim() ? encryptMessage(content.trim()) : '', // Encrypt message content
    };

    // Add attachment fields if provided
    if (attachmentUrl) {
      messageData.attachmentUrl = attachmentUrl;
      messageData.attachmentType = attachmentType || 'file';
      messageData.attachmentName = attachmentName || 'attachment';
    }

    // Create message and update conversation timestamp in parallel
    const [message] = await Promise.all([
      (prisma as any).message.create({
        data: messageData
      }),
      (prisma as any).conversation.update({
        where: { conversationId },
        data: { updatedAt: new Date() }
      })
    ]);

    // Get sender info
    const sender = await (prisma as any).user.findUnique({
      where: { userId },
      select: {
        userId: true,
        name: true,
        profileImage: true,
        role: true
      }
    });

    const responseMessage = {
      ...message,
      content: decryptMessage(message.content), // Decrypt for response
      sender,
      isOwn: true
    };

    // Emit socket event for real-time delivery
    try {
      emitChatMessage({
        messageId: message.messageId,
        conversationId: message.conversationId,
        senderId: message.senderId,
        content: responseMessage.content,
        attachmentUrl: message.attachmentUrl,
        attachmentType: message.attachmentType,
        attachmentName: message.attachmentName,
        createdAt: message.createdAt.toISOString(),
        sender,
      });
    } catch (socketError) {
      console.error('Socket emit error:', socketError);
      // Don't fail the request if socket emit fails
    }

    return NextResponse.json(responseMessage);
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}
