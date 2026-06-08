import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET - Fetch all submission scores for coordinator's campus (panel + supervisor + combined)
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'coordinator') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);

    // Get coordinator's campus
    const coordinator = await (prisma as any).fYPCoordinator.findFirst({
      where: { userId },
      include: { campus: true },
    });

    if (!coordinator) {
      return NextResponse.json({ error: 'Coordinator not found' }, { status: 404 });
    }

    const campusId = coordinator.campusId;

    // Get all active phases for this campus
    const phases = await (prisma as any).fypEvaluationPhase.findMany({
      where: { campusId },
      select: {
        phaseId: true,
        name: true,
        totalMarks: true,
        deadline: true,
        status: true,
      },
      orderBy: { orderIndex: 'asc' },
    });

    const phaseIds = phases.map((p: any) => p.phaseId);

    // Get all submissions with scores for this campus's phases
    const submissions = await (prisma as any).evaluationSubmission.findMany({
      where: {
        phaseId: { in: phaseIds },
      },
      select: {
        submissionId: true,
        phaseId: true,
        groupId: true,
        content: true,
        status: true,
        obtainedMarks: true,
        feedback: true,
        supervisorScore: true,
        supervisorFeedback: true,
        supervisorScoredById: true,
        supervisorScoredAt: true,
        panelScore: true,
        panelFeedback: true,
        panelScoredById: true,
        panelScoredAt: true,
        submittedAt: true,
      },
    });

    // Get all groups for this campus
    const groupIds: number[] = Array.from(new Set(submissions.map((s: any) => s.groupId)));
    const groups = await prisma.group.findMany({
      where: { groupId: { in: groupIds } },
      select: {
        groupId: true,
        groupName: true,
        supervisorId: true,
        students: {
          select: {
            user: { select: { name: true } },
            rollNumber: true,
          }
        }
      },
    });
    const groupMap = new Map(groups.map(g => [g.groupId, g]));

    // Get supervisor names
    const supervisorIds: number[] = Array.from(new Set([
      ...groups.filter(g => g.supervisorId).map(g => g.supervisorId!),
      ...submissions.filter((s: any) => s.supervisorScoredById).map((s: any) => s.supervisorScoredById),
      ...submissions.filter((s: any) => s.panelScoredById).map((s: any) => s.panelScoredById),
    ]));
    const supervisorUsers = await prisma.user.findMany({
      where: { userId: { in: supervisorIds } },
      select: { userId: true, name: true },
    });
    const supervisorNameMap = new Map(supervisorUsers.map(u => [u.userId, u.name]));

    // Create phase map
    const phaseMap = new Map<number, any>(phases.map((p: any) => [p.phaseId, p]));

    // Build the scores data
    const scoresData = submissions.map((sub: any) => {
      const group = groupMap.get(sub.groupId);
      const phase: any = phaseMap.get(sub.phaseId);
      const totalMarks = phase?.totalMarks || 100;

      // Calculate combined score (45% supervisor + 55% panel)
      let combinedScore: number | null = null;
      let combinedPercentage: number | null = null;

      if (sub.supervisorScore !== null && sub.panelScore !== null) {
        combinedScore = Math.round((sub.supervisorScore * 0.45) + (sub.panelScore * 0.55));
        combinedPercentage = (combinedScore / totalMarks) * 100;
      }

      return {
        submissionId: sub.submissionId,
        evaluationId: sub.phaseId,
        evaluationTitle: phase?.name || 'Unknown',
        totalMarks,
        groupId: sub.groupId,
        groupName: group?.groupName || `Group ${sub.groupId}`,
        supervisorName: group?.supervisorId ? supervisorNameMap.get(group.supervisorId) || 'Unknown' : 'Not Assigned',
        students: group?.students.map((s: any) => ({
          name: s.user.name,
          rollNumber: s.rollNumber,
        })) || [],
        submittedAt: sub.submittedAt,
        status: sub.status,
        // Coordinator's own grading
        obtainedMarks: sub.obtainedMarks,
        coordinatorFeedback: sub.feedback,
        // Supervisor scoring
        supervisorScore: sub.supervisorScore,
        supervisorFeedback: sub.supervisorFeedback,
        supervisorScoredBy: sub.supervisorScoredById ? supervisorNameMap.get(sub.supervisorScoredById) || 'Unknown' : null,
        supervisorScoredAt: sub.supervisorScoredAt,
        // Panel scoring
        panelScore: sub.panelScore,
        panelFeedback: sub.panelFeedback,
        panelScoredBy: sub.panelScoredById ? supervisorNameMap.get(sub.panelScoredById) || 'Unknown' : null,
        panelScoredAt: sub.panelScoredAt,
        // Combined (50% each)
        combinedScore,
        combinedPercentage: combinedPercentage !== null ? Math.round(combinedPercentage * 100) / 100 : null,
      };
    });

    // Summary stats
    const totalSubmissions = scoresData.length;
    const supervisorScored = scoresData.filter((s: any) => s.supervisorScore !== null).length;
    const panelScored = scoresData.filter((s: any) => s.panelScore !== null).length;
    const fullyScored = scoresData.filter((s: any) => s.supervisorScore !== null && s.panelScore !== null).length;

    return NextResponse.json({
      scores: scoresData,
      evaluations: phases.map((p: any) => ({
        evaluationId: p.phaseId,
        title: p.name,
        totalMarks: p.totalMarks,
        dueDate: p.deadline,
        status: p.status,
      })),
      summary: {
        totalSubmissions,
        supervisorScored,
        panelScored,
        fullyScored,
      },
      campusName: coordinator.campus.name,
    });
  } catch (error) {
    console.error('Error fetching scores:', error);
    return NextResponse.json({ error: 'Failed to fetch scores' }, { status: 500 });
  }
}
