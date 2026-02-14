import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET - Fetch group details for a panel assignment (submissions, comments, score)
export async function GET(
  request: NextRequest,
  { params }: { params: { panelId: string; groupId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'supervisor') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const panelId = parseInt(params.panelId);
    const groupId = parseInt(params.groupId);

    // Verify the supervisor is a member of this panel
    const membership = await prisma.panelMember.findUnique({
      where: { panelId_supervisorId: { panelId, supervisorId: userId } }
    });

    if (!membership) {
      return NextResponse.json({ error: 'Not a member of this panel' }, { status: 403 });
    }

    // Get the assignment
    const assignment = await (prisma as any).groupPanelAssignment.findUnique({
      where: { panelId_groupId: { panelId, groupId } },
      include: {
        comments: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    // Get commenter details
    const commentUserIds = (assignment.comments || []).map((c: any) => c.userId);
    const commentUsers = await prisma.user.findMany({
      where: { userId: { in: commentUserIds } },
      select: { userId: true, name: true, profileImage: true }
    });
    const userMap = new Map(commentUsers.map(u => [u.userId, u]));

    // Get group details with project and students
    const group = await prisma.group.findUnique({
      where: { groupId },
      select: {
        groupId: true,
        groupName: true,
        projectId: true,
        supervisorId: true,
        students: {
          select: {
            userId: true,
            rollNumber: true,
            user: { select: { name: true, email: true, profileImage: true } }
          }
        }
      }
    });

    // Get group's project if exists
    let project = null;
    if (group?.projectId) {
      const p = await (prisma as any).project.findUnique({
        where: { projectId: group.projectId },
        select: {
          projectId: true,
          title: true,
          description: true,
          abstractText: true,
          category: true,
          status: true,
          documentUrl: true,
          documentName: true,
          repositoryUrl: true,
          demoUrl: true,
        }
      });
      project = p;
    }

    // Get all evaluation submissions for this group
    const submissions = await (prisma as any).evaluationSubmission.findMany({
      where: { groupId },
      include: {
        evaluation: {
          select: {
            evaluationId: true,
            title: true,
            description: true,
            instructions: true,
            totalMarks: true,
            dueDate: true,
            status: true,
          }
        },
        attachments: true
      },
      orderBy: { submittedAt: 'desc' }
    });

    // Determine max score from the highest totalMarks across evaluations, or default 100
    const maxScore = submissions.length > 0
      ? Math.max(...submissions.map((s: any) => s.evaluation?.totalMarks || 100))
      : 100;

    // Get submitter names
    const submitterIds: number[] = Array.from(new Set(submissions.map((s: any) => s.submittedById)));
    const submitters = await prisma.user.findMany({
      where: { userId: { in: submitterIds as number[] } },
      select: { userId: true, name: true }
    });
    const submitterMap = new Map(submitters.map(u => [u.userId, u.name]));

    // Get panel members with roles to check if current user is chair
    const panelMembers = await prisma.panelMember.findMany({
      where: { panelId }
    });
    const memberIds = panelMembers.map(pm => pm.supervisorId);
    const memberUsers = await prisma.user.findMany({
      where: { userId: { in: memberIds } },
      select: { userId: true, name: true }
    });
    const memberMap = new Map(memberUsers.map(u => [u.userId, u]));

    return NextResponse.json({
      assignment: {
        id: assignment.id,
        evaluationDate: assignment.evaluationDate,
        timeSlot: assignment.timeSlot,
        venue: assignment.venue,
        remarks: assignment.remarks,
        score: assignment.score,
        scoredAt: assignment.scoredAt,
      },
      maxScore,
      group: {
        ...group,
        students: group?.students.map((s: any) => ({
          userId: s.userId,
          name: s.user?.name || 'Unknown',
          email: s.user?.email || '',
          rollNumber: s.rollNumber,
          profileImage: s.user?.profileImage || null,
        })) || [],
      },
      project: project ? {
        projectId: project.projectId,
        title: project.title,
        description: project.description,
        abstract: project.abstractText,
        category: project.category,
        status: project.status,
        documentUrl: project.documentUrl,
        documentName: project.documentName,
        repoUrl: project.repositoryUrl,
        demoUrl: project.demoUrl,
      } : null,
      submissions: submissions.map((s: any) => ({
        submissionId: s.submissionId,
        title: s.evaluation?.title || null,
        evaluationDescription: s.evaluation?.description || null,
        totalMarks: s.evaluation?.totalMarks || null,
        dueDate: s.evaluation?.dueDate || null,
        content: s.content,
        status: s.status,
        obtainedMarks: s.obtainedMarks,
        feedback: s.feedback,
        submittedAt: s.submittedAt,
        submittedBy: submitterMap.get(s.submittedById) || 'Unknown',
        // Supervisor scoring
        supervisorScore: s.supervisorScore,
        supervisorFeedback: s.supervisorFeedback,
        supervisorScoredAt: s.supervisorScoredAt,
        // Panel scoring
        panelScore: s.panelScore,
        panelFeedback: s.panelFeedback,
        panelScoredAt: s.panelScoredAt,
        attachments: s.attachments.map((a: any) => ({
          attachmentId: a.attachmentId,
          fileName: a.fileName,
          fileUrl: a.fileUrl,
          fileSize: a.fileSize,
          fileType: a.fileType,
        })),
      })),
      comments: (assignment.comments || []).map((c: any) => ({
        commentId: c.commentId,
        content: c.content,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        userId: c.userId,
        userName: userMap.get(c.userId)?.name || 'Unknown',
        userImage: userMap.get(c.userId)?.profileImage || null,
        isOwn: c.userId === userId,
      })),
      currentUserRole: membership.role,
      isGroupSupervisor: group?.supervisorId === userId,
      panelMembers: panelMembers.map(pm => ({
        supervisorId: pm.supervisorId,
        role: pm.role,
        name: memberMap.get(pm.supervisorId)?.name || 'Unknown',
      })),
    });

  } catch (error) {
    console.error('Error fetching group evaluation details:', error);
    return NextResponse.json({ error: 'Failed to fetch details' }, { status: 500 });
  }
}

// POST - Add a comment to a group's panel assignment
export async function POST(
  request: NextRequest,
  { params }: { params: { panelId: string; groupId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'supervisor') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const panelId = parseInt(params.panelId);
    const groupId = parseInt(params.groupId);

    // Verify membership
    const membership = await prisma.panelMember.findUnique({
      where: { panelId_supervisorId: { panelId, supervisorId: userId } }
    });

    if (!membership) {
      return NextResponse.json({ error: 'Not a member of this panel' }, { status: 403 });
    }

    const { content } = await request.json();

    if (!content?.trim()) {
      return NextResponse.json({ error: 'Comment cannot be empty' }, { status: 400 });
    }

    // Get assignment
    const assignment = await prisma.groupPanelAssignment.findUnique({
      where: { panelId_groupId: { panelId, groupId } }
    });

    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    const comment = await (prisma as any).panelComment.create({
      data: {
        assignmentId: assignment.id,
        userId,
        content: content.trim(),
      }
    });

    // Get user details for response
    const user = await prisma.user.findUnique({
      where: { userId },
      select: { name: true, profileImage: true }
    });

    return NextResponse.json({
      comment: {
        commentId: comment.commentId,
        content: comment.content,
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
        userId: comment.userId,
        userName: user?.name || 'Unknown',
        userImage: user?.profileImage || null,
        isOwn: true,
      }
    });

  } catch (error) {
    console.error('Error adding comment:', error);
    return NextResponse.json({ error: 'Failed to add comment' }, { status: 500 });
  }
}

// PATCH - Score a group (panel head only) or update a comment
export async function PATCH(
  request: NextRequest,
  { params }: { params: { panelId: string; groupId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'supervisor') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const panelId = parseInt(params.panelId);
    const groupId = parseInt(params.groupId);

    const body = await request.json();

    // If scoring
    if (body.action === 'score') {
      // Verify panel head
      const membership = await prisma.panelMember.findUnique({
        where: { panelId_supervisorId: { panelId, supervisorId: userId } }
      });

      if (!membership || membership.role !== 'chair') {
        return NextResponse.json({ error: 'Only the panel head can score groups' }, { status: 403 });
      }

      const { score, maxScore: clientMaxScore } = body;
      const maxAllowed = clientMaxScore || 100;
      if (score === undefined || score === null || score < 0 || score > maxAllowed) {
        return NextResponse.json({ error: `Score must be between 0 and ${maxAllowed}` }, { status: 400 });
      }

      await (prisma as any).groupPanelAssignment.update({
        where: { panelId_groupId: { panelId, groupId } },
        data: {
          score: parseInt(score),
          scoredById: userId,
          scoredAt: new Date(),
        }
      });

      return NextResponse.json({ success: true, score: parseInt(score) });
    }

    // If updating a comment
    if (body.action === 'updateComment') {
      const { commentId, content } = body;

      if (!content?.trim()) {
        return NextResponse.json({ error: 'Comment cannot be empty' }, { status: 400 });
      }

      // Verify ownership
      const comment = await (prisma as any).panelComment.findUnique({
        where: { commentId: parseInt(commentId) }
      });

      if (!comment || comment.userId !== userId) {
        return NextResponse.json({ error: 'Cannot edit this comment' }, { status: 403 });
      }

      const updated = await (prisma as any).panelComment.update({
        where: { commentId: parseInt(commentId) },
        data: { content: content.trim() }
      });

      return NextResponse.json({ success: true, comment: updated });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Error updating:', error);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}

// DELETE - Delete own comment
export async function DELETE(
  request: NextRequest,
  { params }: { params: { panelId: string; groupId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'supervisor') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const { commentId } = await request.json();

    const comment = await (prisma as any).panelComment.findUnique({
      where: { commentId: parseInt(commentId) }
    });

    if (!comment || comment.userId !== userId) {
      return NextResponse.json({ error: 'Cannot delete this comment' }, { status: 403 });
    }

    await (prisma as any).panelComment.delete({
      where: { commentId: parseInt(commentId) }
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error deleting comment:', error);
    return NextResponse.json({ error: 'Failed to delete comment' }, { status: 500 });
  }
}
