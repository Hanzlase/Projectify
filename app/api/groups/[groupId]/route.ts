import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

// GET - Get group details
export async function GET(
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

    // Get the group with all details
    const group = await (prisma as any).group.findUnique({
      where: { groupId },
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
        },
        groupInvitations: {
          include: {
            group: true
          }
        }
      }
    });

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    // Check if user is a member of this group
    const student = await (prisma as any).student.findUnique({ where: { userId } });
    const isMember = group.students.some((s: any) => s.userId === userId) || group.supervisorId === userId;
    
    if (!isMember) {
      return NextResponse.json({ error: 'You are not a member of this group' }, { status: 403 });
    }

    // Get supervisor info
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

    // Get project info
    let project = null;
    if (group.projectId) {
      project = await (prisma as any).project.findUnique({
        where: { projectId: group.projectId },
        select: {
          projectId: true,
          title: true,
          description: true,
          status: true,
          category: true,
          documentUrl: true,
        }
      });
    }

    // Get invitee details for pending invitations
    const pendingInvitations = await Promise.all(
      group.groupInvitations
        .filter((inv: any) => inv.status === 'pending')
        .map(async (inv: any) => {
          const invitee = await prisma.user.findUnique({
            where: { userId: inv.inviteeId },
            select: {
              userId: true,
              name: true,
              email: true,
              profileImage: true,
              role: true,
            }
          });
          return {
            ...inv,
            invitee
          };
        })
    );

    // Check user's admin status
    const isCreator = student && group.createdById === student.studentId;
    const isSupervisor = group.supervisorId === userId;
    const isStudentAdmin = student?.groupId === groupId && student?.isGroupAdmin;
    const isAdmin = isCreator || isSupervisor || isStudentAdmin;

    return NextResponse.json({
      group: {
        ...group,
        supervisor,
        project,
        pendingInvitations,
        isAdmin,
        isCreator,
        currentStudentId: student?.studentId
      }
    });

  } catch (error) {
    console.error('Error fetching group details:', error);
    return NextResponse.json({ error: 'Failed to fetch group details' }, { status: 500 });
  }
}

// PATCH - Update group (image, etc.)
export async function PATCH(
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
    const { groupImage } = body;

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
      return NextResponse.json({ error: 'Only group admins can update the group' }, { status: 403 });
    }

    // Update group
    const updatedGroup = await (prisma as any).group.update({
      where: { groupId },
      data: { groupImage }
    });

    return NextResponse.json({ success: true, group: updatedGroup });

  } catch (error) {
    console.error('Error updating group:', error);
    return NextResponse.json({ error: 'Failed to update group' }, { status: 500 });
  }
}
