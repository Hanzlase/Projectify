import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse, NextRequest } from "next/server";
import { getActivePhase } from "@/lib/cohort-utils";

async function getPastProjects(supervisorUserId: number) {
  try {
    const groups = await prisma.group.findMany({
      where: { supervisorId: supervisorUserId },
      include: {
        students: {
          include: {
            user: {
              select: { name: true }
            },
            campus: true
          }
        }
      }
    });

    const groupIds = groups.map(g => g.groupId);
    if (groupIds.length === 0) return [];

    const projects = await prisma.project.findMany({
      where: {
        OR: [
          { projectId: { in: groups.map(g => g.projectId).filter(Boolean) as number[] } },
          { groupId: { in: groupIds } }
        ]
      }
    });

    const pastProjects = [];
    for (const group of groups) {
      const project = projects.find(p => p.groupId === group.groupId || (group.projectId && p.projectId === group.projectId));
      if (!project) continue;

      let isCompleted = project.status === "completed" || project.status === "archived";
      
      if (!isCompleted && group.fypPhase === "FYP_2" && group.students.length > 0) {
        const student = group.students[0];
        const activePhase = getActivePhase(group.cohort, student.campus.activeSemester);
        if (activePhase === "FYP_1") {
          isCompleted = true;
        }
      }

      if (isCompleted) {
        pastProjects.push({
          projectId: project.projectId,
          title: project.title,
          description: project.description,
          category: project.category,
          status: project.status,
          completedAt: project.updatedAt,
          students: group.students.map(s => s.user.name)
        });
      }
    }
    return pastProjects;
  } catch (error) {
    console.error("Error fetching past supervised projects:", error);
    return [];
  }
}

// Helper function to get another user's profile (read-only)
async function getOtherUserProfile(userId: number, role: string) {
  try {
    if (role === 'supervisor') {
      const supervisor = await prisma.fYPSupervisor.findFirst({
        where: { userId },
        include: {
          user: true,
          campus: true,
        },
      });

      if (!supervisor) {
        return NextResponse.json({ error: "Supervisor not found" }, { status: 404 });
      }

      const pastProjects = await getPastProjects(supervisor.userId);

      return NextResponse.json({
        userId: supervisor.userId,
        name: supervisor.user.name,
        email: supervisor.user.email,
        profileImage: supervisor.user.profileImage,
        specialization: supervisor.specialization,
        description: supervisor.description,
        domains: supervisor.domains,
        skills: supervisor.skills,
        achievements: supervisor.achievements,
        maxGroups: supervisor.maxGroups,
        totalGroups: supervisor.totalGroups,
        available: supervisor.totalGroups < supervisor.maxGroups,
        campus: {
          name: supervisor.campus.name,
          location: supervisor.campus.location,
        },
        pastProjects,
      });
    } else if (role === 'student') {
      const student = await prisma.student.findFirst({
        where: { userId },
        include: {
          user: true,
          campus: true,
          group: true,
        },
      });

      if (!student) {
        return NextResponse.json({ error: "Student not found" }, { status: 404 });
      }

      return NextResponse.json({
        userId: student.userId,
        name: student.user.name,
        email: student.user.email,
        profileImage: student.user.profileImage,
        rollNumber: student.rollNumber,
        batch: student.batch,
        gpa: student.gpa,
        skills: student.skills,
        interests: student.interests,
        bio: student.bio,
        linkedin: student.linkedin,
        github: student.github,
        hasGroup: !!student.groupId,
        groupName: student.group?.groupName,
        campus: {
          name: student.campus.name,
          location: student.campus.location,
        },
      });
    }

    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  } catch (error) {
    console.error("Error fetching other user profile:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if we're fetching another user's profile
    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get('userId');
    const targetRole = searchParams.get('role');

    // If targetUserId is provided, fetch that user's profile (read-only view)
    if (targetUserId && targetRole) {
      return await getOtherUserProfile(parseInt(targetUserId), targetRole);
    }

    // Otherwise, fetch the current user's profile
    const userId = parseInt(session.user.id);

    const user: any = await prisma.user.findUnique({
      where: { userId },
      include: {
        student: {
          include: {
            campus: true,
            group: true,
          },
        },
        supervisor: {
          include: {
            campus: true,
          },
        },
        coordinator: {
          include: {
            campus: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Build profile data based on role
    let profileData: any = {
      userId: user.userId,
      name: user.name,
      email: user.email,
      role: user.role,
      profileImage: user.profileImage,
      createdAt: user.createdAt,
    };

    if (user.role === "student" && user.student) {
      profileData = {
        ...profileData,
        rollNumber: user.student.rollNumber,
        batch: user.student.batch,
        campus: user.student.campus?.name,
        campusLocation: user.student.campus?.location,
        group: user.student.group?.groupName,
        gpa: user.student.gpa,
        skills: user.student.skills,
        interests: user.student.interests,
        bio: user.student.bio,
        linkedin: user.student.linkedin,
        github: user.student.github,
      };
    } else if (user.role === "supervisor" && user.supervisor) {
      const pastProjects = await getPastProjects(user.supervisor.userId);
      profileData = {
        ...profileData,
        campus: user.supervisor.campus?.name,
        campusLocation: user.supervisor.campus?.location,
        specialization: user.supervisor.specialization,
        description: user.supervisor.description,
        domains: user.supervisor.domains,
        skills: user.supervisor.skills,
        achievements: user.supervisor.achievements,
        maxGroups: user.supervisor.maxGroups,
        totalGroups: user.supervisor.totalGroups,
        pastProjects,
      };
    } else if (user.role === "coordinator" && user.coordinator) {
      profileData = {
        ...profileData,
        campus: user.coordinator.campus?.name,
        campusLocation: user.coordinator.campus?.location,
        activeSemester: user.coordinator.campus?.activeSemester,
      };
    }

    return NextResponse.json(profileData);
  } catch (error) {
    console.error("Profile API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
