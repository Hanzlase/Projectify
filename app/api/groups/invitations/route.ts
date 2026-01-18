import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { emitSupervisorAvailability, emitProjectStatus, emitNotificationToUser } from '@/lib/socket-emitters';

// GET - Get group invitations for current user (received or sent)
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'received'; // 'received' or 'sent'

    if (type === 'sent') {
      // Get invitations sent by the current user
      const invitations = await (prisma as any).groupInvitation.findMany({
        where: {
          inviterId: userId
        },
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
                    }
                  }
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      // Add project info and invitee info to each invitation
      const enrichedInvitations = await Promise.all(invitations.map(async (inv: any) => {
        let project = null;
        if (inv.group.projectId) {
          project = await (prisma as any).project.findUnique({
            where: { projectId: inv.group.projectId },
            select: {
              projectId: true,
              title: true,
              description: true,
              category: true,
            }
          });
        }

        const invitee = await prisma.user.findUnique({
          where: { userId: inv.inviteeId },
          select: {
            userId: true,
            name: true,
            email: true,
            profileImage: true,
          }
        });

        // Get student info if invitee is a student
        let inviteeStudent = null;
        if (inv.inviteeRole === 'student') {
          inviteeStudent = await prisma.student.findUnique({
            where: { userId: inv.inviteeId },
            select: {
              studentId: true,
              rollNumber: true,
            }
          });
        }

        return {
          ...inv,
          project,
          invitee,
          inviteeStudent,
        };
      }));

      return NextResponse.json({ invitations: enrichedInvitations });
    }

    // Default: Get received invitations (all statuses)
    const invitations = await (prisma as any).groupInvitation.findMany({
      where: {
        inviteeId: userId
      },
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
                  }
                }
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Add project info and inviter info to each invitation
    const enrichedInvitations = await Promise.all(invitations.map(async (inv: any) => {
      let project = null;
      if (inv.group.projectId) {
        project = await (prisma as any).project.findUnique({
          where: { projectId: inv.group.projectId },
          select: {
            projectId: true,
            title: true,
            description: true,
            category: true,
          }
        });
      }

      const inviter = await prisma.user.findUnique({
        where: { userId: inv.inviterId },
        select: {
          userId: true,
          name: true,
          email: true,
          profileImage: true,
        }
      });

      return {
        ...inv,
        project,
        inviter,
      };
    }));

    return NextResponse.json({ invitations: enrichedInvitations });
  } catch (error) {
    console.error('Error fetching invitations:', error);
    return NextResponse.json({ error: 'Failed to fetch invitations' }, { status: 500 });
  }
}

// POST - Respond to a group invitation (accept/reject)
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const body = await request.json();
    const { invitationId, action } = body;

    if (!invitationId || !['accept', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    // Get the invitation
    const invitation = await (prisma as any).groupInvitation.findUnique({
      where: { id: invitationId },
      include: {
        group: {
          include: {
            students: true,
            groupChats: true
          }
        }
      }
    });

    if (!invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

    if (invitation.inviteeId !== userId) {
      return NextResponse.json({ error: 'This invitation is not for you' }, { status: 403 });
    }

    if (invitation.status !== 'pending') {
      return NextResponse.json({ error: 'This invitation has already been responded to' }, { status: 400 });
    }

    if (action === 'reject') {
      // Update invitation status to rejected
      await (prisma as any).groupInvitation.update({
        where: { id: invitationId },
        data: { status: 'rejected' }
      });

      return NextResponse.json({ success: true, message: 'Invitation rejected' });
    }

    // Handle acceptance
    const group = invitation.group;
    const role = session.user.role;

    if (role === 'student') {
      // Check if student already has a group
      const student = await prisma.student.findUnique({
        where: { userId }
      });

      if (!student) {
        return NextResponse.json({ error: 'Student not found' }, { status: 404 });
      }

      if (student.groupId) {
        // Reject the invitation since user already has a group
        await (prisma as any).groupInvitation.update({
          where: { id: invitationId },
          data: { status: 'rejected' }
        });
        return NextResponse.json({ error: 'You are already in a group' }, { status: 400 });
      }

      // Check if group already has 3 students
      if (group.students.length >= 3) {
        await (prisma as any).groupInvitation.update({
          where: { id: invitationId },
          data: { status: 'rejected' }
        });
        return NextResponse.json({ error: 'This group is already full' }, { status: 400 });
      }

      // Add student to group
      await prisma.student.update({
        where: { studentId: student.studentId },
        data: { groupId: group.groupId }
      });

      // Add to group chat conversation
      if (group.groupChats.length > 0) {
        const conversationId = group.groupChats[0].conversationId;
        await (prisma as any).conversationParticipant.create({
          data: {
            conversationId,
            userId
          }
        });

        // Send join message
        await (prisma as any).message.create({
          data: {
            conversationId,
            senderId: userId,
            content: `👋 ${session.user.name} has joined the group!`
          }
        });
      }

      // Update invitation status
      await (prisma as any).groupInvitation.update({
        where: { id: invitationId },
        data: { status: 'accepted' }
      });

      // Check if group is now full
      const updatedStudentCount = group.students.length + 1;
      const hasSupervisor = group.supervisorId !== null;
      
      if (updatedStudentCount >= 3 && hasSupervisor) {
        // Mark group as full and update project status
        await (prisma as any).group.update({
          where: { groupId: group.groupId },
          data: { isFull: true }
        });

        if (group.projectId) {
          const updatedProject = await (prisma as any).project.update({
            where: { projectId: group.projectId },
            data: { status: 'taken' }
          });

          // Emit project status update via WebSocket
          if (updatedProject.campusId) {
            emitProjectStatus(updatedProject.campusId, {
              projectId: group.projectId,
              status: 'taken',
              groupId: group.groupId,
              updatedAt: new Date().toISOString(),
            });
          }
        }
      }

      return NextResponse.json({ success: true, message: 'You have joined the group!' });

    } else if (role === 'supervisor') {
      // Check if group already has a supervisor
      if (group.supervisorId) {
        await (prisma as any).groupInvitation.update({
          where: { id: invitationId },
          data: { status: 'rejected' }
        });
        return NextResponse.json({ error: 'This group already has a supervisor' }, { status: 400 });
      }

      // Assign supervisor to group
      await (prisma as any).group.update({
        where: { groupId: group.groupId },
        data: { supervisorId: userId }
      });

      // Add to group chat conversation
      if (group.groupChats.length > 0) {
        const conversationId = group.groupChats[0].conversationId;
        await (prisma as any).conversationParticipant.create({
          data: {
            conversationId,
            userId
          }
        });

        // Send join message
        await (prisma as any).message.create({
          data: {
            conversationId,
            senderId: userId,
            content: `🎓 ${session.user.name} (Supervisor) has joined the group!`
          }
        });
      }

      // Update invitation status
      await (prisma as any).groupInvitation.update({
        where: { id: invitationId },
        data: { status: 'accepted' }
      });

      // Check if group is now full
      if (group.students.length >= 3) {
        // Mark group as full and update project status
        await (prisma as any).group.update({
          where: { groupId: group.groupId },
          data: { isFull: true }
        });

        if (group.projectId) {
          const updatedProject = await (prisma as any).project.update({
            where: { projectId: group.projectId },
            data: { status: 'taken' }
          });

          // Emit project status update via WebSocket
          if (updatedProject.campusId) {
            emitProjectStatus(updatedProject.campusId, {
              projectId: group.projectId,
              status: 'taken',
              groupId: group.groupId,
              updatedAt: new Date().toISOString(),
            });
          }
        }
      }

      // Update supervisor's total groups count
      const updatedSupervisor = await (prisma as any).fYPSupervisor.updateMany({
        where: { userId },
        data: { totalGroups: { increment: 1 } }
      });

      // Get supervisor data for availability update
      const supervisor = await prisma.fYPSupervisor.findUnique({
        where: { userId }
      });

      if (supervisor) {
        // Emit supervisor availability update via WebSocket
        emitSupervisorAvailability(supervisor.campusId, {
          supervisorId: userId,
          availableSlots: supervisor.maxGroups - supervisor.totalGroups - 1,
          maxGroups: supervisor.maxGroups,
          totalGroups: supervisor.totalGroups + 1,
        });
      }

      // Notify the inviter that invitation was accepted
      emitNotificationToUser(invitation.inviterId, {
        id: Date.now(),
        type: 'invitation_accepted',
        title: 'Invitation Accepted',
        message: `${session.user.name} has accepted your supervisor invitation`,
        createdAt: new Date().toISOString(),
      });

      return NextResponse.json({ success: true, message: 'You are now supervising this group!' });
    }

    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });

  } catch (error) {
    console.error('Error responding to invitation:', error);
    return NextResponse.json({ error: 'Failed to respond to invitation' }, { status: 500 });
  }
}

// DELETE - Cancel a group invitation by ID (for the inviter)
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const { searchParams } = new URL(request.url);
    const invitationId = searchParams.get('id');

    if (!invitationId) {
      return NextResponse.json({ error: 'Invitation ID is required' }, { status: 400 });
    }

    // Get the invitation
    const invitation = await (prisma as any).groupInvitation.findUnique({
      where: { id: parseInt(invitationId) }
    });

    if (!invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

    // Check if the user is the inviter
    if (invitation.inviterId !== userId) {
      return NextResponse.json({ error: 'You can only cancel invitations you sent' }, { status: 403 });
    }

    // Check if invitation is still pending
    if (invitation.status !== 'pending') {
      return NextResponse.json({ error: 'This invitation has already been responded to' }, { status: 400 });
    }

    // Update invitation status to cancelled
    await (prisma as any).groupInvitation.update({
      where: { id: parseInt(invitationId) },
      data: { status: 'cancelled' }
    });

    return NextResponse.json({ success: true, message: 'Invitation cancelled' });

  } catch (error) {
    console.error('Error cancelling invitation:', error);
    return NextResponse.json({ error: 'Failed to cancel invitation' }, { status: 500 });
  }
}
