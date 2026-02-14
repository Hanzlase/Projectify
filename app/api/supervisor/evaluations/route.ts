import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET - Fetch supervisor's panel assignments
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user || session.user.role !== 'supervisor') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);

    // Get all panels where this supervisor is a member
    const panels = await (prisma as any).evaluationPanel.findMany({
      where: {
        panelMembers: {
          some: {
            supervisorId: userId
          }
        }
      },
      include: {
        panelMembers: true,
        groupAssignments: {
          select: {
            id: true,
            groupId: true,
            evaluationDate: true,
            timeSlot: true,
            venue: true,
            score: true,
            scoredAt: true,
          }
        }
      }
    });

    // Get all supervisor IDs from panel members
    const supervisorIds: number[] = Array.from(new Set(panels.flatMap((p: any) => p.panelMembers.map((pm: any) => pm.supervisorId))));

    // Fetch all supervisors' user data
    const supervisorUsers = await (prisma as any).user.findMany({
      where: {
        userId: { in: supervisorIds }
      },
      select: {
        userId: true,
        name: true,
        email: true,
        supervisor: {
          select: {
            specialization: true
          }
        }
      }
    });

    // Create a map for quick lookup
    const supervisorMap = new Map<number, any>(supervisorUsers.map((u: any) => [u.userId, u]));

    // Get all group IDs from assignments
    const groupIds = panels.flatMap((p: any) => p.groupAssignments.map((ga: any) => ga.groupId));

    // Fetch groups with students and project info
    const groups = await prisma.group.findMany({
      where: {
        groupId: { in: groupIds }
      },
      select: {
        groupId: true,
        groupName: true,
        projectId: true,
        students: {
          select: {
            user: {
              select: {
                name: true
              }
            },
            rollNumber: true
          }
        }
      }
    });

    // Create a map for quick lookup
    const groupMap = new Map(groups.map(g => [g.groupId, g]));

    // Get submission counts per group
    const submissionCounts = await (prisma as any).evaluationSubmission.groupBy({
      by: ['groupId'],
      where: {
        groupId: { in: groupIds }
      },
      _count: { submissionId: true }
    });
    const submissionCountMap = new Map(submissionCounts.map((sc: any) => [sc.groupId, sc._count.submissionId]));

    // Get comment counts per assignment
    const allAssignmentIds = panels.flatMap((p: any) => p.groupAssignments.map((ga: any) => ga.id));
    const commentCounts = await (prisma as any).panelComment.groupBy({
      by: ['assignmentId'],
      where: {
        assignmentId: { in: allAssignmentIds }
      },
      _count: { commentId: true }
    });
    const commentCountMap = new Map(commentCounts.map((cc: any) => [cc.assignmentId, cc._count.commentId]));

    // Transform data
    const transformedPanels = panels.map((panel: any) => {
      // Find current supervisor's role
      const currentMember = panel.panelMembers.find((pm: any) => pm.supervisorId === userId);
      
      return {
        panelId: panel.panelId,
        panelName: panel.name,
        role: currentMember?.role || 'member',
        status: panel.status,
        scheduledDate: panel.scheduledDate,
        evaluationType: panel.evaluationType,
        members: panel.panelMembers.map((pm: any) => {
          const user = supervisorMap.get(pm.supervisorId);
          return {
            supervisorId: pm.supervisorId,
            name: user?.name || 'Unknown',
            email: user?.email || '',
            role: pm.role,
            specialization: user?.supervisor?.specialization || undefined
          };
        }),
        groups: panel.groupAssignments.map((ga: any) => {
          const group = groupMap.get(ga.groupId);
          return {
            assignmentId: ga.id,
            groupId: ga.groupId,
            groupName: group?.groupName || `Group ${ga.groupId}`,
            memberCount: group?.students.length || 0,
            hasProject: !!group?.projectId,
            evaluationDate: ga.evaluationDate,
            timeSlot: ga.timeSlot,
            venue: ga.venue,
            score: ga.score,
            scoredAt: ga.scoredAt,
            submissionCount: submissionCountMap.get(ga.groupId) || 0,
            commentCount: commentCountMap.get(ga.id) || 0,
            students: group?.students.map((s: any) => ({
              name: s.user.name,
              rollNumber: s.rollNumber
            })) || []
          };
        })
      };
    });

    return NextResponse.json({ panels: transformedPanels });

  } catch (error) {
    console.error('Error fetching supervisor evaluations:', error);
    return NextResponse.json({ error: 'Failed to fetch evaluations' }, { status: 500 });
  }
}
