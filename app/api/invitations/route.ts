import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { emitInvitationToUser } from '@/lib/socket-emitters';

// GET - Fetch invitations for the current user
export async function GET(request: Request) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'received'; // 'received' or 'sent'

    // Get the student record for the current user
    const student = await prisma.student.findUnique({
      where: { userId }
    });

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    if (type === 'received') {
      // Get invitations received by the current user
      const invitations = await prisma.invitation.findMany({
        where: { receiverId: student.studentId },
        include: {
          sender: {
            include: {
              user: {
                select: {
                  userId: true,
                  name: true,
                  email: true,
                  profileImage: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      const formattedInvitations = invitations.map(inv => ({
        id: inv.invitationId,
        senderId: inv.sender.userId,
        senderStudentId: inv.sender.studentId,
        senderName: inv.sender.user.name,
        senderEmail: inv.sender.user.email,
        senderProfileImage: inv.sender.user.profileImage,
        senderRollNumber: inv.sender.rollNumber,
        message: inv.message,
        status: inv.status,
        type: inv.type,
        createdAt: inv.createdAt
      }));

      return NextResponse.json({ invitations: formattedInvitations });
    } else {
      // Get invitations sent by the current user
      const invitations = await prisma.invitation.findMany({
        where: { senderId: student.studentId },
        include: {
          receiver: {
            include: {
              user: {
                select: {
                  userId: true,
                  name: true,
                  email: true,
                  profileImage: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      const formattedInvitations = invitations.map(inv => ({
        id: inv.invitationId,
        receiverId: inv.receiver.userId,
        receiverStudentId: inv.receiver.studentId,
        receiverName: inv.receiver.user.name,
        receiverEmail: inv.receiver.user.email,
        receiverProfileImage: inv.receiver.user.profileImage,
        receiverRollNumber: inv.receiver.rollNumber,
        message: inv.message,
        status: inv.status,
        type: inv.type,
        createdAt: inv.createdAt
      }));

      return NextResponse.json({ invitations: formattedInvitations });
    }
  } catch (error) {
    console.error('Invitations API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invitations' },
      { status: 500 }
    );
  }
}

// POST - Send a new invitation
export async function POST(request: Request) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const body = await request.json();
    const { receiverUserId, message, type = 'group_invite' } = body;

    if (!receiverUserId) {
      return NextResponse.json({ error: 'Receiver ID is required' }, { status: 400 });
    }

    // Get the sender's student record
    const sender = await prisma.student.findUnique({
      where: { userId }
    });

    if (!sender) {
      return NextResponse.json({ error: 'Sender student not found' }, { status: 404 });
    }

    // Get the receiver's student record
    const receiver = await prisma.student.findUnique({
      where: { userId: parseInt(receiverUserId) }
    });

    if (!receiver) {
      return NextResponse.json({ error: 'Receiver student not found' }, { status: 404 });
    }

    // Check if sender is trying to send to themselves
    if (sender.studentId === receiver.studentId) {
      return NextResponse.json({ error: 'Cannot send invitation to yourself' }, { status: 400 });
    }

    // Check if an invitation already exists
    const existingInvitation = await prisma.invitation.findFirst({
      where: {
        senderId: sender.studentId,
        receiverId: receiver.studentId,
        type: type,
        status: 'pending'
      }
    });

    if (existingInvitation) {
      return NextResponse.json({ error: 'Invitation already sent' }, { status: 400 });
    }

    // Create the invitation
    const invitation = await prisma.invitation.create({
      data: {
        senderId: sender.studentId,
        receiverId: receiver.studentId,
        message: message || null,
        type: type
      },
      include: {
        receiver: {
          include: {
            user: {
              select: {
                name: true,
                email: true
              }
            }
          }
        }
      }
    });

    // Emit real-time invitation event to the receiver
    try {
      const senderUser = await prisma.user.findUnique({
        where: { userId },
        select: { name: true }
      });
      emitInvitationToUser(receiver.userId, {
        invitationId: invitation.invitationId,
        type: 'student_invite',
        status: 'pending',
        senderId: userId,
        receiverId: receiver.userId,
        senderName: senderUser?.name || 'Someone',
        message: message || undefined,
        createdAt: invitation.createdAt.toISOString(),
      });
    } catch (socketError) {
      // Non-fatal
    }

    return NextResponse.json({
      success: true,
      invitation: {
        id: invitation.invitationId,
        receiverName: invitation.receiver.user.name,
        status: invitation.status,
        createdAt: invitation.createdAt
      }
    });
  } catch (error) {
    console.error('Create invitation error:', error);
    return NextResponse.json(
      { error: 'Failed to send invitation' },
      { status: 500 }
    );
  }
}
