import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function GET() {
  try {
    const session = await auth();
    
    if (!session || session.user.role !== 'supervisor') {
      return NextResponse.json(
        { error: 'Unauthorized - Only supervisors can access this endpoint' },
        { status: 401 }
      );
    }

    // Get the supervisor's campus
    const supervisor = await prisma.fYPSupervisor.findFirst({
      where: {
        userId: parseInt(session.user.id),
      },
    });

    if (!supervisor) {
      return NextResponse.json(
        { error: 'Supervisor profile not found' },
        { status: 404 }
      );
    }

    // Find the coordinator for this campus
    const coordinator = await prisma.fYPCoordinator.findFirst({
      where: {
        campusId: supervisor.campusId,
      },
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
    });

    if (!coordinator) {
      return NextResponse.json({
        coordinator: null,
        message: 'No coordinator found for your campus'
      });
    }

    return NextResponse.json({
      coordinator: {
        userId: coordinator.user.userId,
        name: coordinator.user.name,
        email: coordinator.user.email,
        profileImage: coordinator.user.profileImage,
        role: coordinator.user.role
      }
    });

  } catch (error) {
    console.error('Get coordinator error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
