import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

// GET - Get all conversations for the current user
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);

    // Get all conversations for this user with participants count = 2 (direct messages only)
    const conversations = await (prisma as any).conversation.findMany({
      where: {
        participants: {
          some: {
            userId: userId
          }
        }
      },
      include: {
        participants: true,
        messages: {
          orderBy: {
            createdAt: 'desc'
          },
          take: 1
        },
        _count: {
          select: { participants: true }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    // Filter to only 2-person conversations (direct messages)
    const directConversations = conversations.filter((c: any) => c._count.participants === 2);

    // Get all other participant user IDs
    const otherUserIds = directConversations.map((conv: any) => {
      const otherParticipant = conv.participants.find((p: any) => p.userId !== userId);
      return otherParticipant?.userId;
    }).filter(Boolean) as number[];

    // Fetch all other users in a single query
    const otherUsers = await (prisma as any).user.findMany({
      where: { userId: { in: otherUserIds } },
      select: {
        userId: true,
        name: true,
        email: true,
        role: true,
        profileImage: true
      }
    });

    // Create a map for quick lookup
    const userMap = new Map(otherUsers.map((u: any) => [u.userId, u]));

    // Get unread counts for all conversations in a single query
    const unreadCounts = await (prisma as any).message.groupBy({
      by: ['conversationId'],
      where: {
        conversationId: { in: directConversations.map((c: any) => c.conversationId) },
        senderId: { not: userId },
        isRead: false
      },
      _count: { messageId: true }
    });

    // Create a map for unread counts
    const unreadMap = new Map(unreadCounts.map((u: any) => [u.conversationId, u._count.messageId]));

    // Build the response
    const conversationsWithDetails = directConversations.map((conv: any) => {
      const otherParticipant = conv.participants.find((p: any) => p.userId !== userId);
      if (!otherParticipant) return null;

      const otherUser = userMap.get(otherParticipant.userId);
      if (!otherUser) return null;

      return {
        conversationId: conv.conversationId,
        otherUser,
        lastMessage: conv.messages[0] || null,
        unreadCount: unreadMap.get(conv.conversationId) || 0,
        updatedAt: conv.updatedAt
      };
    }).filter(Boolean);

    // Deduplicate by other user (keep the most recent conversation)
    const seenUsers = new Set<number>();
    const uniqueConversations = conversationsWithDetails.filter((conv: any) => {
      if (!conv || seenUsers.has(conv.otherUser.userId)) {
        return false;
      }
      seenUsers.add(conv.otherUser.userId);
      return true;
    });

    // Get group conversations for this user
    const groupChats = await (prisma as any).groupChat.findMany({
      include: {
        group: {
          include: {
            students: {
              include: {
                user: {
                  select: {
                    userId: true,
                    name: true,
                    email: true,
                    profileImage: true,
                    role: true,
                  }
                }
              }
            }
          }
        }
      }
    });

    // Filter group chats where user is a participant
    const userGroupConversationIds = groupChats
      .filter((gc: any) => {
        const memberUserIds = gc.group.students.map((s: any) => s.user.userId);
        const supervisorId = gc.group.supervisorId;
        return memberUserIds.includes(userId) || supervisorId === userId;
      })
      .map((gc: any) => gc.conversationId);

    // Get group conversation details
    const groupConversations = await (prisma as any).conversation.findMany({
      where: {
        conversationId: { in: userGroupConversationIds }
      },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    // Build group conversation details
    const groupConversationsWithDetails = await Promise.all(
      groupConversations.map(async (conv: any) => {
        const groupChat = groupChats.find((gc: any) => gc.conversationId === conv.conversationId);
        if (!groupChat) return null;

        const group = groupChat.group;
        
        // Get supervisor info if assigned
        let supervisor = null;
        if (group.supervisorId) {
          supervisor = await prisma.user.findUnique({
            where: { userId: group.supervisorId },
            select: {
              userId: true,
              name: true,
              email: true,
              profileImage: true,
              role: true,
            }
          });
        }

        // Count unread messages
        const unreadCount = await (prisma as any).message.count({
          where: {
            conversationId: conv.conversationId,
            senderId: { not: userId },
            isRead: false
          }
        });

        return {
          conversationId: conv.conversationId,
          isGroup: true,
          groupId: group.groupId,
          groupName: group.groupName,
          members: group.students.map((s: any) => s.user),
          supervisor,
          lastMessage: conv.messages[0] || null,
          unreadCount,
          updatedAt: conv.updatedAt
        };
      })
    );

    const validGroupConversations = groupConversationsWithDetails.filter(Boolean);

    // Get pinned conversation IDs
    const pinnedConversations = await (prisma as any).pinnedConversation.findMany({
      where: { userId },
      select: { conversationId: true }
    });
    const pinnedIds = pinnedConversations.map((p: any) => p.conversationId);

    return NextResponse.json({
      conversations: uniqueConversations,
      groupConversations: validGroupConversations,
      pinnedIds
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 });
  }
}

// POST - Create a new conversation or get existing one
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const { recipientId } = await request.json();

    if (!recipientId) {
      return NextResponse.json({ error: 'Recipient ID is required' }, { status: 400 });
    }

    const recipientIdNum = parseInt(recipientId);

    // Check if recipient exists
    const recipient = await prisma.user.findUnique({
      where: { userId: recipientIdNum }
    });

    if (!recipient) {
      return NextResponse.json({ error: 'Recipient not found' }, { status: 404 });
    }

    // Find existing direct conversation between these two users
    // Must have exactly 2 participants and include both users
    const existingConversations = await (prisma as any).conversation.findMany({
      where: {
        AND: [
          { participants: { some: { userId: userId } } },
          { participants: { some: { userId: recipientIdNum } } }
        ]
      },
      include: {
        participants: true,
        _count: { select: { participants: true } }
      }
    });

    // Find a conversation with exactly 2 participants
    const existingConversation = existingConversations.find((c: any) => c._count.participants === 2);

    if (existingConversation) {
      return NextResponse.json({
        conversationId: existingConversation.conversationId,
        isNew: false
      });
    }

    // Create new conversation
    const newConversation = await (prisma as any).conversation.create({
      data: {
        participants: {
          create: [
            { userId: userId },
            { userId: recipientIdNum }
          ]
        }
      }
    });

    return NextResponse.json({
      conversationId: newConversation.conversationId,
      isNew: true
    });
  } catch (error) {
    console.error('Error creating conversation:', error);
    return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 });
  }
}
