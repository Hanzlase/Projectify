import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "supervisor") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const userId = parseInt(session.user.id);

    // Get all invitations for this supervisor
    const invitations = await (prisma as any).groupInvitation.findMany({
      where: {
        inviteeId: userId,
        inviteeRole: "supervisor",
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
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Get projects for invitation groups
    const groupIds = invitations.map((inv: any) => inv.group.groupId);
    const projects = groupIds.length > 0
      ? await (prisma as any).project.findMany({
          where: {
            groupId: { in: groupIds }
          },
          select: {
            projectId: true,
            title: true,
            status: true,
            groupId: true,
          }
        })
      : [];

    const projectsByGroupId = projects.reduce((acc: any, project: any) => {
      acc[project.groupId] = project;
      return acc;
    }, {});

    // Get inviter info separately
    const inviterIds = Array.from(new Set(invitations.map((inv: any) => inv.inviterId))) as number[];
    const inviters = inviterIds.length > 0
      ? await (prisma as any).user.findMany({
          where: {
            userId: { in: inviterIds }
          },
          select: {
            userId: true,
            name: true,
            email: true,
            profileImage: true,
          }
        })
      : [];

    const invitersById = inviters.reduce((acc: any, inviter: any) => {
      acc[inviter.userId] = inviter;
      return acc;
    }, {});

    // Transform the data for the frontend
    const transformedInvitations = invitations.map((inv: any) => {
      const project = projectsByGroupId[inv.group.groupId];
      const inviter = invitersById[inv.inviterId];
      // Use projectId from group table directly, or from project lookup
      const groupProjectId = inv.group.projectId || project?.projectId || null;
      return {
        id: inv.id.toString(),
        status: inv.status.toLowerCase(),
        createdAt: inv.createdAt.toISOString(),
        group: {
          id: inv.group.groupId.toString(),
          name: inv.group.groupName || `Group ${inv.group.groupId}`,
          projectTitle: project?.title || null,
          projectId: groupProjectId?.toString() || null,
          projectStatus: project?.status || null,
          createdAt: inv.group.createdAt.toISOString(),
          members: inv.group.students.map((s: any) => ({
            id: s.user.userId.toString(),
            name: s.user.name || "Unknown",
            email: s.user.email || "",
            image: s.user.profileImage,
          })),
        },
        inviter: {
          id: inviter?.userId?.toString() || inv.inviterId.toString(),
          name: inviter?.name || "Unknown",
          email: inviter?.email || "",
          image: inviter?.profileImage || null,
        },
      };
    });

    return NextResponse.json({ invitations: transformedInvitations });
  } catch (error) {
    console.error("Error fetching supervisor invitations:", error);
    return NextResponse.json(
      { error: "Failed to fetch invitations" },
      { status: 500 }
    );
  }
}
