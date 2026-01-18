import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);

    // Get student details with campus
    const student = await prisma.student.findUnique({
      where: { userId },
      include: {
        campus: true,
        group: {
          include: {
            students: {
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
          }
        }
      }
    });

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Run all independent queries in parallel for better performance
    const [
      supervisors,
      fellowStudents,
      totalSupervisors,
      totalStudents,
      pendingInvitations,
      totalProjects
    ] = await Promise.all([
      // Get all supervisors in the same campus
      prisma.fYPSupervisor.findMany({
        where: { campusId: student.campusId },
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
      }),
      // Get fellow students in the same campus (excluding current student)
      prisma.student.findMany({
        where: {
          campusId: student.campusId,
          userId: { not: userId }
        },
        include: {
          user: {
            select: {
              userId: true,
              name: true,
              email: true,
              profileImage: true
            }
          },
          group: true
        },
        take: 50
      }),
      // Count supervisors
      prisma.fYPSupervisor.count({
        where: { campusId: student.campusId }
      }),
      // Count students
      prisma.student.count({
        where: { campusId: student.campusId }
      }),
      // Count pending invitations received by the student (student-to-student)
      prisma.invitation.count({
        where: {
          receiverId: student.studentId,
          status: 'pending'
        }
      }),
      // Count total projects in the campus (both public and private)
      prisma.project.count({
        where: { campusId: student.campusId }
      })
    ]);

    // Format supervisors for response
    const formattedSupervisors = supervisors.map((sup) => ({
      id: sup.supervisorId,
      userId: sup.user.userId,
      name: sup.user.name,
      email: sup.user.email,
      profileImage: sup.user.profileImage,
      specialization: sup.specialization,
      domains: sup.domains,
      skills: sup.skills,
      maxGroups: sup.maxGroups,
      totalGroups: sup.totalGroups,
      available: sup.totalGroups < sup.maxGroups
    }));

    // Format fellow students for response
    const formattedStudents = fellowStudents.map((stu) => ({
      id: stu.studentId,
      userId: stu.user.userId,
      name: stu.user.name,
      email: stu.user.email,
      profileImage: stu.user.profileImage,
      rollNumber: stu.rollNumber,
      batch: stu.batch,
      skills: stu.skills,
      interests: stu.interests,
      hasGroup: !!stu.groupId
    }));

    // Format group members if student has a group
    const groupMembers = student.group?.students.map((member) => ({
      id: member.studentId,
      userId: member.user.userId,
      name: member.user.name,
      email: member.user.email,
      profileImage: member.user.profileImage,
      rollNumber: member.rollNumber,
      isCurrentUser: member.userId === userId
    })) || [];

    return NextResponse.json({
      student: {
        id: student.studentId,
        rollNumber: student.rollNumber,
        batch: student.batch,
        skills: student.skills,
        interests: student.interests,
        bio: student.bio,
        gpa: student.gpa,
        linkedin: student.linkedin,
        github: student.github
      },
      campus: {
        id: student.campus.campusId,
        name: student.campus.name,
        location: student.campus.location
      },
      group: student.group ? {
        id: student.group.groupId,
        name: student.group.groupName,
        members: groupMembers
      } : null,
      stats: {
        totalSupervisors,
        totalStudents,
        groupSize: groupMembers.length,
        pendingInvitations,
        totalProjects
      },
      supervisors: formattedSupervisors,
      fellowStudents: formattedStudents
    });

  } catch (error) {
    console.error('Student dashboard API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}
