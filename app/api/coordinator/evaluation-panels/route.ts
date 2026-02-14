import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET - Fetch evaluation panels and statistics
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user || session.user.role !== 'coordinator') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);

    // Get coordinator's campus
    const coordinator = await prisma.fYPCoordinator.findUnique({
      where: { userId },
      select: { campusId: true }
    });

    if (!coordinator) {
      return NextResponse.json({ error: 'Coordinator not found' }, { status: 404 });
    }

    const { campusId } = coordinator;

    // Get campus info
    const campus = await prisma.campus.findUnique({
      where: { campusId },
      select: { name: true, location: true }
    });

    // Get all evaluation panels for this campus
    const panels = await prisma.evaluationPanel.findMany({
      where: { campusId },
      include: {
        panelMembers: {
          include: {
            panel: {
              select: {
                panelId: true,
                name: true
              }
            }
          }
        },
        groupAssignments: {
          select: {
            groupId: true,
            evaluationDate: true,
            timeSlot: true,
            venue: true
          }
        },
        _count: {
          select: {
            panelMembers: true,
            groupAssignments: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Get statistics
    // Total groups with supervisor assigned (ready for evaluation)
    const totalGroups = await prisma.group.count({
      where: {
        students: {
          some: {
            campusId,
            groupId: { not: null }
          }
        },
        supervisorId: { not: null } // Only require supervisor to be assigned
      }
    });

    // Total supervisors in campus
    const totalSupervisors = await prisma.fYPSupervisor.count({
      where: { campusId }
    });

    // Get supervisors already in panels
    const supervisorsInPanels = await prisma.panelMember.findMany({
      where: {
        panel: { campusId }
      },
      select: { supervisorId: true },
      distinct: ['supervisorId']
    });

    const supervisorIdsInPanels = supervisorsInPanels.map(pm => pm.supervisorId);

    // Get all supervisors NOT already in panels
    const supervisors = await prisma.user.findMany({
      where: {
        role: 'supervisor',
        supervisor: {
          campusId
        },
        userId: {
          notIn: supervisorIdsInPanels
        }
      },
      select: {
        userId: true,
        name: true,
        email: true,
        profileImage: true,
        supervisor: {
          select: {
            supervisorId: true,
            specialization: true,
            maxGroups: true,
            totalGroups: true,
            domains: true,
            skills: true,
            achievements: true,
            description: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    // Get all groups with their supervisor and project info
    // Include groups that have a supervisor assigned (ready for evaluation)
    const groups = await prisma.group.findMany({
      where: {
        students: {
          some: {
            campusId,
            groupId: { not: null }
          }
        },
        supervisorId: { not: null } // Only require supervisor to be assigned
      },
      select: {
        groupId: true,
        groupName: true,
        supervisorId: true,
        projectId: true,
        isFull: true,
        students: {
          select: {
            userId: true,
            user: {
              select: {
                name: true,
                email: true
              }
            },
            rollNumber: true
          }
        }
      }
    });

    // Transform panels data
    const transformedPanels = await Promise.all(panels.map(async panel => {
      const memberDetails = await Promise.all(panel.panelMembers.map(async member => {
        const user = await prisma.user.findUnique({
          where: { userId: member.supervisorId },
          select: {
            userId: true,
            name: true,
            email: true,
            profileImage: true,
            supervisor: {
              select: {
                specialization: true,
                totalGroups: true
              }
            }
          }
        });
        return {
          ...member,
          user
        };
      }));

      return {
        ...panel,
        panelMembers: memberDetails
      };
    }));

    return NextResponse.json({
      panels: transformedPanels,
      statistics: {
        totalGroups,
        totalSupervisors,
        totalPanels: panels.length,
        activePanels: panels.filter(p => p.status === 'active').length
      },
      supervisors: supervisors.map(s => ({
        userId: s.userId,
        name: s.name,
        email: s.email,
        profileImage: s.profileImage,
        specialization: s.supervisor?.specialization,
        description: s.supervisor?.description,
        domains: s.supervisor?.domains,
        skills: s.supervisor?.skills,
        achievements: s.supervisor?.achievements,
        maxGroups: s.supervisor?.maxGroups || 0,
        totalGroups: s.supervisor?.totalGroups || 0,
        availableSlots: (s.supervisor?.maxGroups || 0) - (s.supervisor?.totalGroups || 0)
      })),
      groups: groups.map(g => ({
        groupId: g.groupId,
        groupName: g.groupName || `Group ${g.groupId}`,
        supervisorId: g.supervisorId,
        projectId: g.projectId,
        memberCount: g.students.length,
        students: g.students.map(s => ({
          userId: s.userId,
          name: s.user.name,
          email: s.user.email,
          rollNumber: s.rollNumber
        }))
      })),
      campusName: campus?.name || 'Unknown Campus'
    });

  } catch (error) {
    console.error('Error fetching evaluation panels:', error);
    return NextResponse.json({ error: 'Failed to fetch evaluation panels' }, { status: 500 });
  }
}

// POST - Create new evaluation panel
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user || session.user.role !== 'coordinator') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const body = await request.json();

    const { 
      name, 
      description, 
      minSupervisors, 
      maxSupervisors,
      scheduledDate,
      panelMembers, // Array of { supervisorId, role }
      groupAssignments // Array of { groupId, evaluationDate?, timeSlot?, venue? }
    } = body;

    if (!name || !minSupervisors || !maxSupervisors) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get coordinator's campus
    const coordinator = await prisma.fYPCoordinator.findUnique({
      where: { userId },
      select: { campusId: true }
    });

    if (!coordinator) {
      return NextResponse.json({ error: 'Coordinator not found' }, { status: 404 });
    }

    // Validate panel members count
    if (panelMembers && panelMembers.length > 0) {
      if (panelMembers.length < minSupervisors) {
        return NextResponse.json({ 
          error: `Panel must have at least ${minSupervisors} supervisors` 
        }, { status: 400 });
      }
      if (panelMembers.length > maxSupervisors) {
        return NextResponse.json({ 
          error: `Panel cannot have more than ${maxSupervisors} supervisors` 
        }, { status: 400 });
      }
    }

    // Create panel with members and assignments
    const panel = await prisma.evaluationPanel.create({
      data: {
        name,
        description,
        minSupervisors,
        maxSupervisors,
        scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
        campusId: coordinator.campusId,
        createdById: userId,
        status: panelMembers && panelMembers.length >= minSupervisors ? 'active' : 'draft',
        panelMembers: panelMembers ? {
          create: panelMembers.map((member: any) => ({
            supervisorId: member.supervisorId,
            role: member.role || 'member'
          }))
        } : undefined,
        groupAssignments: groupAssignments ? {
          create: groupAssignments.map((assignment: any) => ({
            groupId: assignment.groupId,
            evaluationDate: assignment.evaluationDate ? new Date(assignment.evaluationDate) : null,
            timeSlot: assignment.timeSlot,
            venue: assignment.venue,
            remarks: assignment.remarks
          }))
        } : undefined
      },
      include: {
        panelMembers: true,
        groupAssignments: true
      }
    });

    return NextResponse.json({ 
      success: true, 
      panel,
      message: 'Evaluation panel created successfully'
    });

  } catch (error) {
    console.error('Error creating evaluation panel:', error);
    return NextResponse.json({ error: 'Failed to create evaluation panel' }, { status: 500 });
  }
}

// PATCH - Update evaluation panel
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user || session.user.role !== 'coordinator') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { panelId, action, ...updateData } = body;

    if (!panelId) {
      return NextResponse.json({ error: 'Panel ID required' }, { status: 400 });
    }

    if (action === 'activate') {
      // Activate panel
      const panel = await prisma.evaluationPanel.update({
        where: { panelId },
        data: { status: 'active' }
      });
      return NextResponse.json({ success: true, panel });
    }

    if (action === 'complete') {
      // Complete panel
      const panel = await prisma.evaluationPanel.update({
        where: { panelId },
        data: { status: 'completed' }
      });
      return NextResponse.json({ success: true, panel });
    }

    if (action === 'addMember') {
      // Add panel member
      const { supervisorId, role } = updateData;
      const member = await prisma.panelMember.create({
        data: {
          panelId,
          supervisorId,
          role: role || 'member'
        }
      });
      return NextResponse.json({ success: true, member });
    }

    if (action === 'removeMember') {
      // Remove panel member
      const { memberId } = updateData;
      await prisma.panelMember.delete({
        where: { id: memberId }
      });
      return NextResponse.json({ success: true });
    }

    if (action === 'assignGroup') {
      // Assign group to panel
      const { groupId, evaluationDate, timeSlot, venue } = updateData;
      const assignment = await prisma.groupPanelAssignment.create({
        data: {
          panelId,
          groupId,
          evaluationDate: evaluationDate ? new Date(evaluationDate) : null,
          timeSlot,
          venue
        }
      });
      return NextResponse.json({ success: true, assignment });
    }

    if (action === 'updateMemberRole') {
      // Update panel member role - first reset all to member, then set one as chair
      const { supervisorId, role } = updateData;
      
      // Reset all members of this panel to 'member'
      await prisma.panelMember.updateMany({
        where: { panelId },
        data: { role: 'member' }
      });

      // Set the specified supervisor as chair
      await prisma.panelMember.updateMany({
        where: { 
          panelId,
          supervisorId 
        },
        data: { role }
      });

      return NextResponse.json({ success: true });
    }

    // General update - handle panel info, members, and groups
    if (updateData.panelMembers || updateData.groupAssignments) {
      // Delete existing members and groups
      await prisma.panelMember.deleteMany({ where: { panelId } });
      await prisma.groupPanelAssignment.deleteMany({ where: { panelId } });

      // Update panel and recreate members/groups
      const panel = await prisma.evaluationPanel.update({
        where: { panelId },
        data: {
          name: updateData.name,
          description: updateData.description,
          minSupervisors: updateData.minSupervisors,
          maxSupervisors: updateData.maxSupervisors,
          scheduledDate: updateData.scheduledDate ? new Date(updateData.scheduledDate) : null,
          panelMembers: updateData.panelMembers ? {
            create: updateData.panelMembers.map((member: any) => ({
              supervisorId: member.supervisorId,
              role: member.role || 'member'
            }))
          } : undefined,
          groupAssignments: updateData.groupAssignments ? {
            create: updateData.groupAssignments.map((groupId: number) => ({
              groupId
            }))
          } : undefined
        }
      });

      return NextResponse.json({ success: true, panel });
    }

    // General update
    const panel = await prisma.evaluationPanel.update({
      where: { panelId },
      data: updateData
    });

    return NextResponse.json({ success: true, panel });

  } catch (error) {
    console.error('Error updating evaluation panel:', error);
    return NextResponse.json({ error: 'Failed to update evaluation panel' }, { status: 500 });
  }
}

// DELETE - Delete evaluation panel
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user || session.user.role !== 'coordinator') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const panelId = searchParams.get('panelId');

    if (!panelId) {
      return NextResponse.json({ error: 'Panel ID required' }, { status: 400 });
    }

    await prisma.evaluationPanel.delete({
      where: { panelId: parseInt(panelId) }
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error deleting evaluation panel:', error);
    return NextResponse.json({ error: 'Failed to delete evaluation panel' }, { status: 500 });
  }
}
