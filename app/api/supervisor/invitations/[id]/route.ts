import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "supervisor") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const userId = parseInt(session.user.id);
    const invitationId = parseInt(params.id);

    const { action } = await request.json();

    if (!action || !["accept", "reject"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Must be 'accept' or 'reject'" },
        { status: 400 }
      );
    }

    // Find the invitation
    const invitation = await (prisma as any).groupInvitation.findUnique({
      where: { id: invitationId },
      include: {
        group: true,
      },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 }
      );
    }

    // Verify this invitation is for the current supervisor
    if (invitation.inviteeId !== userId) {
      return NextResponse.json(
        { error: "This invitation is not for you" },
        { status: 403 }
      );
    }

    // Check if invitation is still pending
    if (invitation.status !== "pending") {
      return NextResponse.json(
        { error: "This invitation has already been responded to" },
        { status: 400 }
      );
    }

    const newStatus = action === "accept" ? "accepted" : "rejected";

    // Update the invitation status
    await (prisma as any).groupInvitation.update({
      where: { id: invitationId },
      data: { status: newStatus },
    });

    // If accepted, assign supervisor to the group
    if (action === "accept") {
      await (prisma as any).group.update({
        where: { groupId: invitation.groupId },
        data: { supervisorId: userId },
      });

      // Add supervisor to group chat conversation
      const groupChat = await (prisma as any).groupChat.findFirst({
        where: { groupId: invitation.groupId }
      });

      if (groupChat) {
        // Check if supervisor is already a participant (to avoid duplicate)
        const existingParticipant = await (prisma as any).conversationParticipant.findUnique({
          where: {
            conversationId_userId: {
              conversationId: groupChat.conversationId,
              userId
            }
          }
        });

        if (!existingParticipant) {
          await (prisma as any).conversationParticipant.create({
            data: {
              conversationId: groupChat.conversationId,
              userId
            }
          });

          // Send join message
          await (prisma as any).message.create({
            data: {
              conversationId: groupChat.conversationId,
              senderId: userId,
              content: `🎓 ${session.user.name || 'Supervisor'} (Supervisor) has joined the group!`
            }
          });
        }
      }

      // Create notification for group members (students in this group)
      const groupStudents = await (prisma as any).student.findMany({
        where: { groupId: invitation.groupId },
        select: { userId: true },
      });

      if (groupStudents.length > 0) {
        await (prisma as any).notification.createMany({
          data: groupStudents.map((student: any) => ({
            userId: student.userId,
            title: "Supervisor Joined",
            message: `${session.user.name || "A supervisor"} has accepted your invitation to supervise your group "${invitation.group.groupName || 'your group'}"`,
            type: "GROUP_UPDATE",
          })),
        });
      }
    } else {
      // Create notification for the inviter about rejection
      await (prisma as any).notification.create({
        data: {
          userId: invitation.inviterId,
          title: "Invitation Declined",
          message: `${session.user.name || "A supervisor"} has declined your invitation to supervise "${invitation.group.groupName || 'your group'}"`,
          type: "GROUP_UPDATE",
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: action === "accept" 
        ? "You are now supervising this group" 
        : "Invitation declined",
    });
  } catch (error) {
    console.error("Error responding to invitation:", error);
    return NextResponse.json(
      { error: "Failed to respond to invitation" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const invitationId = parseInt(params.id);

    const invitation = await (prisma as any).groupInvitation.findUnique({
      where: { id: invitationId },
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
                  },
                },
              },
            },
          },
        },
        inviter: {
          select: {
            userId: true,
            name: true,
            email: true,
            profileImage: true,
          },
        },
      },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ invitation });
  } catch (error) {
    console.error("Error fetching invitation:", error);
    return NextResponse.json(
      { error: "Failed to fetch invitation" },
      { status: 500 }
    );
  }
}
