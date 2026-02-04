import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await auth();

    if (!session || session.user.role !== "supervisor") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = parseInt(session.user.id);

    // Get the supervisor's data
    const supervisor = await (prisma as any).fYPSupervisor.findFirst({
      where: {
        user: {
          email: session.user.email!,
        },
      },
      include: {
        campus: true,
      },
    });

    if (!supervisor) {
      return NextResponse.json({ error: "Supervisor not found" }, { status: 404 });
    }

    // Run all independent queries in parallel for better performance
    const [assignedGroups, pendingInvitations, totalStudents, totalProjects, recentNotifications] = await Promise.all([
      // Get groups where this supervisor is assigned
      (prisma as any).group.findMany({
        where: {
          supervisorId: userId,
        },
        include: {
          students: {
            include: {
              user: {
                select: {
                  name: true,
                  email: true,
                  profileImage: true,
                }
              }
            }
          },
          groupChats: {
            select: {
              conversationId: true,
            }
          },
        }
      }),
      // Get pending group invitations for this supervisor
      (prisma as any).groupInvitation.findMany({
        where: {
          inviteeId: userId,
          inviteeRole: 'supervisor',
          status: 'pending'
        },
        include: {
          group: {
            include: {
              students: {
                include: {
                  user: {
                    select: {
                      name: true,
                      profileImage: true,
                    }
                  }
                }
              },
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      // Get total students from the supervisor's campus
      prisma.student.count({
        where: {
          campusId: supervisor.campusId,
        },
      }),
      // Get total projects from the campus
      prisma.project.count({
        where: {
          campusId: supervisor.campusId,
        },
      }),
      // Get notifications for the supervisor
      prisma.notificationRecipient.findMany({
        where: {
          userId: userId,
        },
        include: {
          notification: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 5,
      })
    ]);

    // Get projects for groups (need projectIds from groups)
    const projectIdsFromGroups = assignedGroups
      .map((g: any) => g.projectId)
      .filter((id: any) => id !== null);
    const invitationProjectIds = pendingInvitations
      .map((inv: any) => inv.group.projectId)
      .filter((id: any) => id !== null);
    const allProjectIds = Array.from(new Set([...projectIdsFromGroups, ...invitationProjectIds]));
    
    // Fetch all projects in one query by projectId
    const allProjects = allProjectIds.length > 0 
      ? await (prisma as any).project.findMany({
          where: {
            projectId: { in: allProjectIds }
          },
          select: {
            projectId: true,
            title: true,
            status: true,
            description: true,
            groupId: true,
          }
        })
      : [];

    // Map projects by projectId for easy lookup
    const projectsById = allProjects.reduce((acc: any, project: any) => {
      acc[project.projectId] = project;
      return acc;
    }, {});

    // Add project info to groups using group.projectId
    const groupsWithProjects = assignedGroups.map((group: any) => ({
      ...group,
      project: group.projectId ? projectsById[group.projectId] || null : null
    }));

    // Add project info to invitations using group.projectId
    const invitationsWithProjects = pendingInvitations.map((inv: any) => ({
      ...inv,
      group: {
        ...inv.group,
        project: inv.group.projectId ? projectsById[inv.group.projectId] || null : null
      }
    }));

    const recentActivity = recentNotifications.map((nr) => ({
      action: nr.notification.title,
      user: nr.notification.message.substring(0, 50) + (nr.notification.message.length > 50 ? '...' : ''),
      time: getRelativeTime(nr.createdAt),
      type: "info" as const,
    }));

    // Format groups for response
    const formattedGroups = groupsWithProjects.map((group: any) => ({
      id: group.groupId,
      name: group.groupName,
      studentCount: group.students.length,
      students: group.students.map((s: any) => ({
        userId: s.userId,
        name: s.user.name,
        email: s.user.email,
        rollNumber: s.rollNumber,
        profileImage: s.user.profileImage,
      })),
      projectTitle: group.project?.title || null,
      projectId: group.project?.projectId || null,
      projectStatus: group.project?.status || null,
      conversationId: group.groupChats?.[0]?.conversationId || null,
    }));

    // Format invitations
    const formattedInvitations = invitationsWithProjects.map((inv: any) => ({
      id: inv.id,
      groupId: inv.groupId,
      groupName: inv.group.groupName,
      projectTitle: inv.group.project?.title || 'No project yet',
      projectDescription: inv.group.project?.description || null,
      studentCount: inv.group.students.length,
      students: inv.group.students.map((s: any) => ({
        name: s.user.name,
        profileImage: s.user.profileImage,
      })),
      createdAt: inv.createdAt,
      message: inv.message,
    }));

    return NextResponse.json({
      stats: {
        totalGroups: groupsWithProjects.length,
        totalStudents,
        totalProjects,
        pendingProposals: invitationsWithProjects.length,
        approvedProposals: groupsWithProjects.length,
      },
      recentActivity,
      groups: formattedGroups,
      pendingInvitations: formattedInvitations,
      campusName: supervisor.campus.name,
      specialization: supervisor.specialization,
    });
  } catch (error) {
    console.error("Supervisor Dashboard API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  return date.toLocaleDateString();
}
