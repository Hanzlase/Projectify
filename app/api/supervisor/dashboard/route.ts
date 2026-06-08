import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getActivePhase } from "@/lib/cohort-utils";

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

    const groupIds = assignedGroups.map((group: any) => group.groupId);

    const [assignedMeetings, allProjects] = await Promise.all([
      groupIds.length > 0
        ? prisma.meeting.findMany({
            where: {
              groupId: { in: groupIds },
            },
            select: {
              createdAt: true,
            },
          })
        : [],
      (() => {
        const projectIdsFromGroups = assignedGroups
          .map((g: any) => g.projectId)
          .filter((id: any) => id !== null);
        const invitationProjectIds = pendingInvitations
          .map((inv: any) => inv.group.projectId)
          .filter((id: any) => id !== null);
        const allProjectIds = Array.from(new Set([...projectIdsFromGroups, ...invitationProjectIds]));

        return allProjectIds.length > 0
          ? (prisma as any).project.findMany({
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
      })(),
    ]);

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

    const activityTrendData = buildMonthlyTrendData(assignedMeetings, pendingInvitations);
    const projectStatusData = buildProjectStatusData(groupsWithProjects);

    // Format groups for response
    const formattedGroups = groupsWithProjects.map((group: any) => {
      const activePhase = getActivePhase(group.cohort, supervisor.campus.activeSemester);
      const isCompleted = 
        group.project?.status === "completed" || 
        group.project?.status === "archived" ||
        (group.fypPhase === "FYP_2" && activePhase === "FYP_1");

      return {
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
        isCompleted,
      };
    });

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
      charts: {
        activityTrendData,
        projectStatusData,
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

function buildMonthlyTrendData(
  meetings: Array<{ createdAt: Date }>,
  invitations: Array<{ createdAt: Date }>
) {
  const months = getRecentMonths(6);
  const meetingCounts = new Map<string, number>();
  const invitationCounts = new Map<string, number>();

  months.forEach((month) => {
    meetingCounts.set(month.key, 0);
    invitationCounts.set(month.key, 0);
  });

  meetings.forEach((meeting) => {
    const key = getMonthKey(meeting.createdAt);
    if (meetingCounts.has(key)) {
      meetingCounts.set(key, (meetingCounts.get(key) || 0) + 1);
    }
  });

  invitations.forEach((invitation) => {
    const key = getMonthKey(invitation.createdAt);
    if (invitationCounts.has(key)) {
      invitationCounts.set(key, (invitationCounts.get(key) || 0) + 1);
    }
  });

  return months.map((month) => ({
    month: month.label,
    meetings: meetingCounts.get(month.key) || 0,
    invitations: invitationCounts.get(month.key) || 0,
  }));
}

function buildProjectStatusData(groupsWithProjects: any[]) {
  const completedCount = groupsWithProjects.filter((group: any) => {
    return group.project?.status === 'completed' || group.project?.status === 'archived';
  }).length;

  const inProgressCount = groupsWithProjects.filter((group: any) => {
    return !!group.project && group.project?.status !== 'completed' && group.project?.status !== 'archived';
  }).length;

  const noProjectCount = groupsWithProjects.filter((group: any) => !group.project).length;

  return [
    { name: 'In Progress', value: inProgressCount, color: '#1a5d1a' },
    { name: 'Completed', value: completedCount, color: '#2d7a2d' },
    { name: 'No Project', value: noProjectCount, color: '#9ca3af' },
  ];
}

function getRecentMonths(count: number) {
  const months = [] as Array<{ key: string; label: string }>;
  const now = new Date();

  for (let offset = count - 1; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    months.push({
      key: getMonthKey(date),
      label: date.toLocaleString('en-US', { month: 'short' }),
    });
  }

  return months;
}

function getMonthKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}`;
}
