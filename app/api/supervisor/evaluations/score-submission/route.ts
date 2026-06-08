import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isGroupCompleted } from '@/lib/cohort-utils';

// POST - Supervisor scores a submission for a group they supervise
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'supervisor') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const { submissionId, score, feedback, maxScore, scoringType } = await request.json();

    if (!submissionId) {
      return NextResponse.json({ error: 'Submission ID is required' }, { status: 400 });
    }

    // Get the submission
    const submission = await (prisma as any).evaluationSubmission.findUnique({
      where: { submissionId: parseInt(submissionId) },
      select: {
        submissionId: true,
        groupId: true,
        phase: { select: { totalMarks: true } },
        panelMemberScores: true
      }
    });

    if (!submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    if (await isGroupCompleted(submission.groupId)) {
      return NextResponse.json({ error: "Forbidden: This group's FYP is completed." }, { status: 403 });
    }

    const totalMarks = submission.phase?.totalMarks || maxScore || 100;

    if (score === undefined || score === null || score < 0 || score > totalMarks) {
      return NextResponse.json({ error: `Score must be between 0 and ${totalMarks}` }, { status: 400 });
    }

    // Determine scoring type: 'supervisor' (group's own supervisor) or 'panel' (panel member)
    if (scoringType === 'panel') {
      // Allow any panel member (not just chair) to submit a panel score for this submission
      // Verify the user is a member of a panel that has this group assigned
      const panelMembership = await prisma.panelMember.findFirst({
        where: {
          supervisorId: userId,
          panel: {
            groupAssignments: {
              some: {
                groupId: submission.groupId
              }
            }
          }
        }
      });

      if (!panelMembership) {
        return NextResponse.json({ error: 'Only panel members can give panel scores' }, { status: 403 });
      }

      // Read the existing panelMemberScores JSON, update this user's entry
      const current = submission.panelMemberScores || null;
      let memberScoresObj: any = {};
      try {
        memberScoresObj = current ? JSON.parse(JSON.stringify(current)) : {};
      } catch {
        memberScoresObj = {};
      }

      memberScoresObj[userId] = {
        score: parseInt(score),
        feedback: feedback?.trim() || null,
        scoredAt: new Date().toISOString(),
      };

      // Compute aggregated panelScore as average of member scores
      const numericScores = Object.values(memberScoresObj)
        .map((v: any) => Number(v?.score))
        .filter((n: number) => !isNaN(n));

      const aggregatedPanelScore = numericScores.length > 0
        ? Math.round(numericScores.reduce((a: number, b: number) => a + b, 0) / numericScores.length)
        : null;

      await (prisma as any).evaluationSubmission.update({
        where: { submissionId: parseInt(submissionId) },
        data: {
          panelMemberScores: memberScoresObj,
          panelScore: aggregatedPanelScore,
          panelScoredAt: new Date(),
          panelScoredById: null,
          panelFeedback: null,
        }
      });

      return NextResponse.json({
        success: true,
        type: 'panel',
        aggregatedPanelScore,
        memberScore: parseInt(score),
        memberScores: memberScoresObj,
      });
    } else {
      // Supervisor scoring - verify the user is the supervisor for the group
      const group = await prisma.group.findFirst({
        where: {
          groupId: submission.groupId,
          supervisorId: userId,
        }
      });

      if (!group) {
        return NextResponse.json({ error: 'You are not the supervisor of this group' }, { status: 403 });
      }

      await (prisma as any).evaluationSubmission.update({
        where: { submissionId: parseInt(submissionId) },
        data: {
          supervisorScore: parseInt(score),
          supervisorFeedback: feedback?.trim() || null,
          supervisorScoredById: userId,
          supervisorScoredAt: new Date(),
        }
      });

      return NextResponse.json({
        success: true,
        type: 'supervisor',
        score: parseInt(score),
        feedback: feedback?.trim() || null,
      });
    }
  } catch (error) {
    console.error('Error scoring submission:', error);
    return NextResponse.json({ error: 'Failed to score submission' }, { status: 500 });
  }
}
