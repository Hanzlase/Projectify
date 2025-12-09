import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    // Get the current session to identify the coordinator
    const session = await auth();
    
    if (!session || session.user.role !== 'coordinator') {
      return NextResponse.json(
        { error: 'Unauthorized - Only coordinators can view users' },
        { status: 401 }
      );
    }

    // Get the coordinator's campus from database
    const coordinator = await prisma.fYPCoordinator.findFirst({
      where: {
        userId: parseInt(session.user.id),
      },
    });

    if (!coordinator) {
      return NextResponse.json(
        { error: 'Coordinator profile not found' },
        { status: 404 }
      );
    }

    const campusId = coordinator.campusId;

    // Fetch all students from the campus
    const students = await prisma.student.findMany({
      where: {
        campusId: campusId,
      },
      include: {
        user: true,
      },
    });

    // Fetch all supervisors from the campus
    const supervisors = await prisma.fYPSupervisor.findMany({
      where: {
        campusId: campusId,
      },
      include: {
        user: true,
      },
    });

    // Format students
    const formattedStudents = students.map((s: any) => ({
      userId: s.user.userId,
      name: s.user.name,
      email: s.user.email,
      role: s.user.role,
      status: s.user.status || 'ACTIVE',
      createdAt: s.user.createdAt,
      student: {
        rollNumber: s.rollNumber,
        batch: s.batch,
      },
    }));

    // Format supervisors
    const formattedSupervisors = supervisors.map((s: any) => ({
      userId: s.user.userId,
      name: s.user.name,
      email: s.user.email,
      role: s.user.role,
      status: s.user.status || 'ACTIVE',
      createdAt: s.user.createdAt,
      supervisor: {
        specialization: s.specialization,
        totalGroups: s.totalGroups,
        maxGroups: s.maxGroups,
      },
    }));

    // Combine and sort by creation date (newest first)
    const allUsers = [...formattedStudents, ...formattedSupervisors].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json({
      success: true,
      users: allUsers,
    });

  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
