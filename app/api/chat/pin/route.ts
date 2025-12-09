import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

// GET - Get pinned conversations for the current user
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);

    const pinnedConversations = await (prisma as any).pinnedConversation.findMany({
      where: { userId },
      orderBy: { pinnedAt: 'desc' }
    });

    return NextResponse.json({ 
      pinnedIds: pinnedConversations.map((p: any) => p.conversationId) 
    });
  } catch (error) {
    console.error('Error fetching pinned conversations:', error);
    return NextResponse.json({ error: 'Failed to fetch pinned conversations' }, { status: 500 });
  }
}

// POST - Pin a conversation
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const body = await request.json();
    const { conversationId } = body;

    if (!conversationId) {
      return NextResponse.json({ error: 'Conversation ID is required' }, { status: 400 });
    }

    // Check if already pinned
    const existing = await (prisma as any).pinnedConversation.findUnique({
      where: {
        userId_conversationId: {
          userId,
          conversationId
        }
      }
    });

    if (existing) {
      return NextResponse.json({ success: true, message: 'Already pinned' });
    }

    // Pin the conversation
    await (prisma as any).pinnedConversation.create({
      data: {
        userId,
        conversationId
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error pinning conversation:', error);
    return NextResponse.json({ error: 'Failed to pin conversation' }, { status: 500 });
  }
}

// DELETE - Unpin a conversation
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const { searchParams } = new URL(request.url);
    const conversationId = parseInt(searchParams.get('conversationId') || '0');

    if (!conversationId) {
      return NextResponse.json({ error: 'Conversation ID is required' }, { status: 400 });
    }

    await (prisma as any).pinnedConversation.deleteMany({
      where: {
        userId,
        conversationId
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error unpinning conversation:', error);
    return NextResponse.json({ error: 'Failed to unpin conversation' }, { status: 500 });
  }
}
