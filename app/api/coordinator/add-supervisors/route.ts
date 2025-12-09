import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';
import bcrypt from 'bcrypt';
import { auth } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    // Get the current session to identify the coordinator
    const session = await auth();
    
    if (!session || session.user.role !== 'coordinator') {
      return NextResponse.json(
        { error: 'Unauthorized - Only coordinators can add supervisors' },
        { status: 401 }
      );
    }

    const { supervisors, names, usernames, emails, specializations } = await request.json();

    // Support both old format (supervisors array) and new format (separate arrays)
    let supervisorsList: any[] = [];
    
    if (supervisors && Array.isArray(supervisors)) {
      // Old format
      supervisorsList = supervisors;
    } else if (names && usernames && emails) {
      // New format
      for (let i = 0; i < names.length; i++) {
        supervisorsList.push({
          name: names[i],
          username: usernames[i],
          email: emails[i],
          specialization: specializations?.[i] || '',
        });
      }
    }

    if (supervisorsList.length === 0) {
      return NextResponse.json(
        { error: 'Supervisor information is required' },
        { status: 400 }
      );
    }

    // Get the coordinator's campus from database (this ensures correct campus is always used)
    const coordinator = await prisma.fYPCoordinator.findFirst({
      where: {
        userId: parseInt(session.user.id),
      },
      include: {
        campus: true,
      },
    });

    if (!coordinator) {
      return NextResponse.json(
        { error: 'Coordinator profile not found' },
        { status: 404 }
      );
    }

    const campusId = coordinator.campusId;
    console.log(`Adding supervisors to campus: ${coordinator.campus.name} (ID: ${campusId})`);

    const results: {
      success: Array<{ name: string; username: string; email: string; password: string; specialization?: string }>;
      failed: Array<{ name?: string; username?: string; reason: string }>;
    } = {
      success: [],
      failed: [],
    };

    for (const supervisor of supervisorsList) {
      try {
        const { name, username, email, specialization } = supervisor;
        
        if (!name || !username || !email) {
          results.failed.push({ name: name || 'Unknown', username, reason: 'Missing name, username, or email' });
          continue;
        }

        // Check if email already exists
        const existingUser = await prisma.user.findUnique({
          where: { email },
        });

        if (existingUser) {
          results.failed.push({ name, username, reason: 'Email already exists' });
          continue;
        }

        // Generate password: name (lowercase, no spaces) + 123
        // e.g., "Saqib Ameer" becomes "saqibameer123"
        const nameForPassword = name.toLowerCase().replace(/\s+/g, '');
        const password = nameForPassword + '123';
        const passwordHash = await bcrypt.hash(password, 10);

        // Create user
        const user = await prisma.user.create({
          data: {
            name,
            email,
            passwordHash,
            role: UserRole.supervisor,
          },
        });

        // Create supervisor profile
        await prisma.fYPSupervisor.create({
          data: {
            userId: user.userId,
            campusId: campusId,
            specialization: specialization || null,
          },
        });

        results.success.push({
          name,
          username,
          email,
          password,
          specialization: specialization || undefined,
        });
      } catch (error: any) {
        results.failed.push({
          name: supervisor.name || 'Unknown',
          username: supervisor.username,
          reason: error.message || 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      success: true,
      results,
    });

  } catch (error) {
    console.error('Add supervisors error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
