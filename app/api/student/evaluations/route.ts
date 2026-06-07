import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getActivePhase, isStudentCompleted } from "@/lib/cohort-utils";

// GET - Fetch evaluations for student
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "student") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = parseInt(session.user.id);

    // Get student's details including group
    const student = await prisma.student.findUnique({
      where: { userId },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // If student has a group, fetch panels assigned to their group
    let panels: any[] = [];
    if (student.groupId) {
      const panelAssignments = await prisma.groupPanelAssignment.findMany({
        where: {
          groupId: student.groupId
        },
        include: {
          panel: {
            include: {
              panelMembers: true
            }
          }
        }
      });

      // Fetch panel members' details
      const allMemberIds = panelAssignments.flatMap(pa => 
        pa.panel.panelMembers.map(pm => pm.supervisorId)
      );

      const memberUsers = await prisma.user.findMany({
        where: {
          userId: { in: allMemberIds }
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

      const userMap = new Map(memberUsers.map(u => [u.userId, u]));

      panels = panelAssignments.map(pa => ({
        panelId: pa.panel.panelId,
        panelName: pa.panel.name,
        evaluationType: pa.panel.evaluationType,
        status: pa.panel.status,
        scheduledDate: pa.panel.scheduledDate,
        evaluationDate: pa.evaluationDate,
        timeSlot: pa.timeSlot,
        venue: pa.venue,
        members: pa.panel.panelMembers.map(pm => {
          const user = userMap.get(pm.supervisorId);
          return {
            supervisorId: pm.supervisorId,
            name: user?.name || 'Unknown',
            email: user?.email || '',
            role: pm.role,
            specialization: user?.supervisor?.specialization || undefined
          };
        })
      }));
    }

    const campus = await prisma.campus.findUnique({
      where: { campusId: student.campusId },
      select: { activeSemester: true }
    });
    const activePhase = campus ? getActivePhase(student.cohort, campus.activeSemester) : 'FYP_1';

    // Fetch active phases for student's campus matching their cohort & phase
    const evaluations = await (prisma as any).fypEvaluationPhase.findMany({
      where: {
        campusId: student.campusId,
        status: { in: ["active", "closed", "graded"] },
        cohort: student.cohort,
        fypPhase: activePhase,
      },
      include: {
        attachments: true,
        submissions: student.groupId ? {
          where: { groupId: student.groupId },
          include: { attachments: true },
        } : false,
      },
      orderBy: { deadline: "asc" },
    });

    // Format evaluations with submission status (mapping to what frontend expects)
    const formattedEvaluations = evaluations.map((ev: any) => {
      const submission = ev.submissions?.[0] || null;
      const now = new Date();
      const dueDate = ev.deadline ? new Date(ev.deadline) : null;
      const isOverdue = dueDate ? (now > dueDate && !submission) : false;
      
      return {
        id: ev.phaseId,
        title: ev.name,
        description: ev.description || "",
        instructions: ev.instructions,
        totalMarks: ev.totalMarks,
        dueDate: ev.deadline,
        status: ev.status,
        createdAt: ev.createdAt,
        isOverdue,
        attachments: ev.attachments.map((att: any) => ({
          id: att.attachmentId,
          fileName: att.fileName,
          fileUrl: att.fileUrl,
          fileSize: att.fileSize,
          fileType: att.fileType,
        })),
        submission: submission ? {
          id: submission.submissionId,
          content: submission.content,
          status: submission.status,
          obtainedMarks: submission.obtainedMarks,
          feedback: submission.feedback,
          submittedAt: submission.submittedAt,
          gradedAt: submission.gradedAt,
          supervisorScore: submission.supervisorScore,
          supervisorFeedback: submission.supervisorFeedback,
          supervisorScoredAt: submission.supervisorScoredAt,
          panelScore: submission.panelScore,
          panelFeedback: submission.panelFeedback,
          panelScoredAt: submission.panelScoredAt,
          attachments: submission.attachments.map((att: any) => ({
            id: att.attachmentId,
            fileName: att.fileName,
            fileUrl: att.fileUrl,
            fileSize: att.fileSize,
            fileType: att.fileType,
          })),
        } : null,
      };
    });

    const isCompleted = await isStudentCompleted(userId);

    return NextResponse.json({
      evaluations: formattedEvaluations,
      panels: panels,
      hasGroup: !!student.groupId,
      groupId: student.groupId,
      isCompleted,
    });
  } catch (error) {
    console.error("Error fetching student evaluations:", error);
    return NextResponse.json({ error: "Failed to fetch evaluations" }, { status: 500 });
  }
}

// POST - Submit evaluation work (links to FypEvaluationPhase via phaseId)
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "student") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    if (await isStudentCompleted(userId)) {
      return NextResponse.json({ error: "Forbidden: You are in Read-Only / Portfolio Mode." }, { status: 403 });
    }
    const body = await req.json();
    const { evaluationId, content, attachments } = body; // evaluationId here is the phaseId

    if (!evaluationId) {
      return NextResponse.json({ error: "Phase ID is required" }, { status: 400 });
    }

    // Get student's group
    const student = await prisma.student.findUnique({
      where: { userId },
    });

    if (!student || !student.groupId) {
      return NextResponse.json({ error: "You must be in a group to submit" }, { status: 400 });
    }

    // Check if phase exists and is active
    const phase = await (prisma as any).fypEvaluationPhase.findUnique({
      where: { phaseId: parseInt(evaluationId) },
    });

    if (!phase) {
      return NextResponse.json({ error: "Evaluation Phase not found" }, { status: 404 });
    }

    if (phase.status === "closed" || phase.status === "graded") {
      return NextResponse.json({ error: "This evaluation is closed for submissions" }, { status: 400 });
    }

    // Check if already submitted
    const existingSubmission = await (prisma as any).evaluationSubmission.findUnique({
      where: {
        phaseId_groupId: {
          phaseId: parseInt(evaluationId),
          groupId: student.groupId,
        },
      },
    });

    if (existingSubmission) {
      return NextResponse.json({ error: "Your group has already submitted" }, { status: 400 });
    }

    // Determine if late submission
    const now = new Date();
    const dueDate = phase.deadline ? new Date(phase.deadline) : null;
    const isLate = dueDate ? (now > dueDate) : false;

    // Create submission
    const submission = await (prisma as any).evaluationSubmission.create({
      data: {
        phaseId: parseInt(evaluationId),
        groupId: student.groupId,
        submittedById: userId,
        content: content || null,
        status: isLate ? "late" : "submitted",
        attachments: attachments?.length > 0 ? {
          create: attachments.map((att: any) => ({
            fileName: att.fileName,
            fileUrl: att.fileUrl,
            fileSize: att.fileSize || null,
            fileType: att.fileType || null,
          })),
        } : undefined,
      },
      include: {
        attachments: true,
      },
    });

    return NextResponse.json({
      success: true,
      submission: {
        id: submission.submissionId,
        status: submission.status,
        submittedAt: submission.submittedAt,
        attachments: submission.attachments,
      },
    });
  } catch (error) {
    console.error("Error submitting evaluation:", error);
    return NextResponse.json({ error: "Failed to submit evaluation" }, { status: 500 });
  }
}

// PATCH - Update submission (before grading)
export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "student") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    if (await isStudentCompleted(userId)) {
      return NextResponse.json({ error: "Forbidden: You are in Read-Only / Portfolio Mode." }, { status: 403 });
    }
    const body = await req.json();
    const { submissionId, content, attachments } = body;

    if (!submissionId) {
      return NextResponse.json({ error: "Submission ID is required" }, { status: 400 });
    }

    // Get student's group
    const student = await prisma.student.findUnique({
      where: { userId },
    });

    if (!student || !student.groupId) {
      return NextResponse.json({ error: "You must be in a group" }, { status: 400 });
    }

    // Check if submission exists and belongs to student's group
    const existingSubmission = await (prisma as any).evaluationSubmission.findUnique({
      where: { submissionId: parseInt(submissionId) },
      include: { phase: true },
    });

    if (!existingSubmission || existingSubmission.groupId !== student.groupId) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    if (existingSubmission.status === "graded") {
      return NextResponse.json({ error: "Cannot edit graded submission" }, { status: 400 });
    }

    // Update submission
    const submission = await (prisma as any).evaluationSubmission.update({
      where: { submissionId: parseInt(submissionId) },
      data: {
        content: content || existingSubmission.content,
        updatedAt: new Date(),
      },
    });

    // Add new attachments if provided
    if (attachments?.length > 0) {
      await (prisma as any).submissionAttachment.createMany({
        data: attachments.map((att: any) => ({
          submissionId: parseInt(submissionId),
          fileName: att.fileName,
          fileUrl: att.fileUrl,
          fileSize: att.fileSize || null,
          fileType: att.fileType || null,
        })),
      });
    }

    return NextResponse.json({ success: true, submission });
  } catch (error) {
    console.error("Error updating submission:", error);
    return NextResponse.json({ error: "Failed to update submission" }, { status: 500 });
  }
}

// DELETE - Unsubmit / withdraw a submission (before grading)
export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "student") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    if (await isStudentCompleted(userId)) {
      return NextResponse.json({ error: "Forbidden: You are in Read-Only / Portfolio Mode." }, { status: 403 });
    }
    const { searchParams } = new URL(req.url);
    const submissionId = searchParams.get("submissionId");

    if (!submissionId) {
      return NextResponse.json({ error: "Submission ID is required" }, { status: 400 });
    }

    // Get student's group
    const student = await prisma.student.findUnique({
      where: { userId },
    });

    if (!student || !student.groupId) {
      return NextResponse.json({ error: "You must be in a group" }, { status: 400 });
    }

    // Check if submission exists and belongs to student's group
    const existingSubmission = await (prisma as any).evaluationSubmission.findUnique({
      where: { submissionId: parseInt(submissionId) },
      include: { phase: true },
    });

    if (!existingSubmission || existingSubmission.groupId !== student.groupId) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    if (existingSubmission.status === "graded") {
      return NextResponse.json({ error: "Cannot withdraw a graded submission" }, { status: 400 });
    }

    if (existingSubmission.supervisorScore !== null || existingSubmission.panelScore !== null) {
      return NextResponse.json({ error: "Cannot withdraw a scored submission" }, { status: 400 });
    }

    // Delete attachments first
    await (prisma as any).submissionAttachment.deleteMany({
      where: { submissionId: parseInt(submissionId) },
    });

    // Delete the submission
    await (prisma as any).evaluationSubmission.delete({
      where: { submissionId: parseInt(submissionId) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting submission:", error);
    return NextResponse.json({ error: "Failed to withdraw submission" }, { status: 500 });
  }
}
