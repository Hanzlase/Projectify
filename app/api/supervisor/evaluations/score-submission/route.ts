import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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
      include: {
        evaluation: { select: { totalMarks: true } }
      }
    });

    if (!submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    const totalMarks = submission.evaluation?.totalMarks || maxScore || 100;

    if (score === undefined || score === null || score < 0 || score > totalMarks) {
      return NextResponse.json({ error: `Score must be between 0 and ${totalMarks}` }, { status: 400 });
    }

    // Determine scoring type: 'supervisor' (group's own supervisor) or 'panel' (panel head)
    if (scoringType === 'panel') {
      // Panel head scoring - verify the user is a panel head for a panel that has this group assigned
      const group = await prisma.group.findFirst({
        where: {
          students: {
            some: {
              userId: submission.submittedById
            }
          }
        }
      });

      // Find panel assignment for this group where user is chair
      const panelMembership = await prisma.panelMember.findFirst({
        where: {
          supervisorId: userId,
          role: 'chair',
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
        return NextResponse.json({ error: 'Only panel heads can give panel scores' }, { status: 403 });
      }

      await (prisma as any).evaluationSubmission.update({
        where: { submissionId: parseInt(submissionId) },
        data: {
          panelScore: parseInt(score),
          panelFeedback: feedback?.trim() || null,
          panelScoredById: userId,
          panelScoredAt: new Date(),
        }
      });

      return NextResponse.json({
        success: true,
        type: 'panel',
        score: parseInt(score),
        feedback: feedback?.trim() || null,
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
