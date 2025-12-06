import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import bcrypt from 'bcrypt';

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const body = await request.json();
    const { 
      name, 
      currentPassword, 
      newPassword, 
      // Supervisor fields
      specialization, 
      description, 
      domains, 
      skills: supervisorSkills, 
      achievements,
      // Student fields
      gpa,
      skills: studentSkills,
      interests,
      bio,
      linkedin,
      github,
    } = body;

    // Find user
    const user = await prisma.user.findUnique({
      where: { userId },
      include: {
        supervisor: true,
        student: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // If changing password, verify current password
    if (newPassword && currentPassword) {
      const passwordMatch = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!passwordMatch) {
        return NextResponse.json(
          { error: 'Current password is incorrect' },
          { status: 401 }
        );
      }
    }

    // Prepare update data
    const updateData: any = {};
    
    if (name && name.trim()) {
      updateData.name = name.trim();
    }

    // Hash new password if provided
    if (newPassword && currentPassword) {
      if (newPassword.length < 6) {
        return NextResponse.json(
          { error: 'New password must be at least 6 characters' },
          { status: 400 }
        );
      }
      updateData.passwordHash = await bcrypt.hash(newPassword, 10);
    }

    // Update user
    if (Object.keys(updateData).length > 0) {
      await prisma.user.update({
        where: { userId },
        data: updateData,
      });
    }

    // Update supervisor-specific fields if applicable
    if (user.role === 'supervisor' && user.supervisor) {
      const supervisorUpdate: any = {};
      
      if (specialization !== undefined) {
        supervisorUpdate.specialization = specialization || null;
      }
      if (description !== undefined) {
        supervisorUpdate.description = description || null;
      }
      if (domains !== undefined) {
        supervisorUpdate.domains = domains || null;
      }
      if (supervisorSkills !== undefined) {
        supervisorUpdate.skills = supervisorSkills || null;
      }
      if (achievements !== undefined) {
        supervisorUpdate.achievements = achievements || null;
      }

      if (Object.keys(supervisorUpdate).length > 0) {
        await prisma.fYPSupervisor.update({
          where: { userId },
          data: supervisorUpdate,
        });
      }
    }

    // Update student-specific fields if applicable
    if (user.role === 'student' && user.student) {
      const studentUpdate: any = {};
      
      if (gpa !== undefined) {
        studentUpdate.gpa = gpa ? parseFloat(gpa) : null;
      }
      if (studentSkills !== undefined) {
        studentUpdate.skills = studentSkills || null;
      }
      if (interests !== undefined) {
        studentUpdate.interests = interests || null;
      }
      if (bio !== undefined) {
        studentUpdate.bio = bio || null;
      }
      if (linkedin !== undefined) {
        studentUpdate.linkedin = linkedin || null;
      }
      if (github !== undefined) {
        studentUpdate.github = github || null;
      }

      if (Object.keys(studentUpdate).length > 0) {
        await prisma.student.update({
          where: { userId },
          data: studentUpdate,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
    });

  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json(
      { error: 'An error occurred while updating profile' },
      { status: 500 }
    );
  }
}
