import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import bcrypt from 'bcrypt';
import { emitSupervisorAvailability } from '@/lib/socket-emitters';

/**
 * Automatically carries over evaluation panels from FYP-1 to FYP-2 when the semester transitions.
 * FALL -> SPRING: REGULAR cohort transitions (FYP_1 -> FYP_2)
 * SPRING -> FALL: DELAYED cohort transitions (FYP_1 -> FYP_2)
 */
async function carryOverPanels(campusId: number, fromSemester: 'FALL' | 'SPRING', toSemester: 'FALL' | 'SPRING') {
  let transitioningCohort: 'REGULAR' | 'DELAYED' | null = null;
  if (fromSemester === 'FALL' && toSemester === 'SPRING') {
    transitioningCohort = 'REGULAR';
  } else if (fromSemester === 'SPRING' && toSemester === 'FALL') {
    transitioningCohort = 'DELAYED';
  }

  if (!transitioningCohort) return;

  try {
    // Fetch all FYP_1 panels for this cohort on the campus
    const fyp1Panels = await prisma.evaluationPanel.findMany({
      where: {
        campusId,
        cohort: transitioningCohort,
        fypPhase: 'FYP_1'
      },
      include: {
        panelMembers: true,
        groupAssignments: true
      }
    });

    for (const panel of fyp1Panels) {
      // Check if this panel has already been cloned to FYP_2
      const existingClone = await prisma.evaluationPanel.findFirst({
        where: {
          campusId,
          cohort: transitioningCohort,
          fypPhase: 'FYP_2',
          name: panel.name
        }
      });

      if (!existingClone) {
        // Clone the panel into FYP_2
        await prisma.evaluationPanel.create({
          data: {
            name: panel.name,
            description: panel.description,
            minSupervisors: panel.minSupervisors,
            maxSupervisors: panel.maxSupervisors,
            campusId,
            cohort: transitioningCohort,
            fypPhase: 'FYP_2',
            createdById: panel.createdById,
            status: panel.status,
            panelMembers: {
              create: panel.panelMembers.map(pm => ({
                supervisorId: pm.supervisorId,
                role: pm.role
              }))
            },
            groupAssignments: {
              create: panel.groupAssignments.map(ga => ({
                groupId: ga.groupId,
                remarks: ga.remarks
              }))
            }
          }
        });
      }
    }
  } catch (error) {
    console.error("Error carrying over panels:", error);
  }
}

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
      const hasUpper = /[A-Z]/.test(newPassword);
      const hasLower = /[a-z]/.test(newPassword);
      const hasDigit = /[0-9]/.test(newPassword);
      const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);

      if (newPassword.length < 8 || !hasUpper || !hasLower || !hasDigit || !hasSpecial) {
        return NextResponse.json(
          { error: 'New password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one digit, and one special character (!@#$%^&*, etc.).' },
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
        const updatedSupervisor = await prisma.fYPSupervisor.update({
          where: { userId },
          data: supervisorUpdate,
        });

        // Emit supervisor availability update via WebSocket
        emitSupervisorAvailability(updatedSupervisor.campusId, {
          supervisorId: userId,
          availableSlots: updatedSupervisor.maxGroups - updatedSupervisor.totalGroups,
          maxGroups: updatedSupervisor.maxGroups,
          totalGroups: updatedSupervisor.totalGroups,
        });

        // Generate and store supervisor embedding in Pinecone
        try {
          const spec = updatedSupervisor.specialization || '';
          const desc = updatedSupervisor.description || '';
          const doms = updatedSupervisor.domains || '';
          const skls = updatedSupervisor.skills || '';
          const achs = updatedSupervisor.achievements || '';
          
          const textToEmbed = [spec, desc, doms, skls, achs].filter(Boolean).join(' ');
          if (textToEmbed.trim()) {
            const { generateEmbedding } = await import('@/lib/cohere');
            const { upsertSupervisorEmbedding } = await import('@/lib/pinecone');
            const embedding = await generateEmbedding(textToEmbed);
            const finalName = name?.trim() || user.name;
            await upsertSupervisorEmbedding(embedding, {
              supervisorId: userId,
              name: finalName,
              specialization: spec,
              description: desc,
              domains: doms,
              skills: skls,
              achievements: achs,
              campusId: updatedSupervisor.campusId,
            });
          }
        } catch (embeddingError) {
          console.error('Failed to update supervisor embedding in Pinecone:', embeddingError);
        }
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

    // Update coordinator-specific fields (activeSemester) if applicable
    if (user.role === 'coordinator') {
      const { activeSemester } = body;
      if (activeSemester !== undefined && (activeSemester === 'FALL' || activeSemester === 'SPRING')) {
        const coordinator = await (prisma as any).fYPCoordinator.findUnique({
          where: { userId },
          include: { campus: true }
        });
        if (coordinator && coordinator.campus.activeSemester !== activeSemester) {
          const fromSemester = coordinator.campus.activeSemester;
          await (prisma as any).campus.update({
            where: { campusId: coordinator.campusId },
            data: { activeSemester },
          });

          // Carry over evaluation panels from FYP_1 to FYP_2
          await carryOverPanels(coordinator.campusId, fromSemester, activeSemester);
        }
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
