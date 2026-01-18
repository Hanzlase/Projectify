import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await auth();

    if (!session || session.user.role !== "coordinator") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the coordinator's campus
    const coordinator = await prisma.fYPCoordinator.findFirst({
      where: {
        user: {
          email: session.user.email!,
        },
      },
      include: {
        campus: true,
      },
    });

    if (!coordinator) {
      return NextResponse.json({ error: "Coordinator not found" }, { status: 404 });
    }

    const campusId = coordinator.campusId;
    const campusName = coordinator.campus.name;

    // Run all independent queries in parallel for better performance
    const [
      totalStudents,
      totalSupervisors,
      activeProjects,
      recentStudents,
      recentSupervisors
    ] = await Promise.all([
      // Get total students count for this campus
      prisma.student.count({
        where: {
          campusId: campusId,
        },
      }),
      // Get total supervisors count for this campus
      prisma.fYPSupervisor.count({
        where: {
          campusId: campusId,
        },
      }),
      // Get total groups (active projects) for this campus
      prisma.group.count({
        where: {
          students: {
            some: {
              campusId: campusId,
            },
          },
        },
      }),
      // Get recent students
      prisma.student.findMany({
        where: {
          campusId: campusId,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 3,
        include: {
          user: {
            select: {
              name: true,
            },
          },
        },
      }),
      // Get recent supervisors
      prisma.fYPSupervisor.findMany({
        where: {
          campusId: campusId,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 2,
        include: {
          user: {
            select: {
              name: true,
            },
          },
        },
      })
    ]);

    // For now, pending approvals will be 0 (can be implemented later with a proper approval system)
    const pendingApprovals = 0;

    // Build recent activity from real data
    const recentActivity = [
      ...recentStudents.map((student) => ({
        action: "Student registered",
        user: `${student.user.name} (${student.rollNumber})`,
        time: getRelativeTime(student.createdAt),
        type: "success" as const,
      })),
      ...recentSupervisors.map((supervisor) => ({
        action: "Supervisor added",
        user: supervisor.user.name,
        time: getRelativeTime(supervisor.createdAt),
        type: "success" as const,
      })),
    ]
      .sort((a, b) => {
        // Sort by time (most recent first) - this is approximate
        return 0;
      })
      .slice(0, 5);

    return NextResponse.json({
      stats: {
        totalStudents,
        totalSupervisors,
        activeProjects,
        pendingApprovals,
      },
      recentActivity,
      campusName,
      campusId,
      upcomingDeadlines: [], // Empty for now - can be implemented with a Deadline model later
    });
  } catch (error) {
    console.error("Dashboard API error:", error);
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
