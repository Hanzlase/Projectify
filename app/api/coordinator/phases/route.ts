import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// GET - List phases for the coordinator's campus, filtered by cohort & fypPhase
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "coordinator") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const { searchParams } = new URL(req.url);
    const cohort = searchParams.get("cohort") || "REGULAR";
    const fypPhase = searchParams.get("fypPhase") || "FYP_1";

    const coordinator = await (prisma as any).fYPCoordinator.findFirst({
      where: { userId },
      include: { campus: true },
    });

    if (!coordinator) {
      return NextResponse.json({ error: "Coordinator not found" }, { status: 404 });
    }

    const phases = await (prisma as any).fypEvaluationPhase.findMany({
      where: {
        campusId: coordinator.campusId,
        cohort: cohort as any,
        fypPhase: fypPhase as any,
      },
      include: {
        attachments: true,
        submissions: {
          include: {
            attachments: true,
          },
        },
        _count: {
          select: {
            submissions: true,
            panels: true,
          },
        },
      },
      orderBy: { orderIndex: "asc" },
    });

    // Get total groups count for campus under this specific cohort
    const totalGroups = await (prisma as any).group.count({
      where: {
        cohort: cohort as any,
        students: {
          some: {
            campusId: coordinator.campusId,
          },
        },
      },
    });

    // Compute total weightage for this FYP+cohort
    const totalWeightage = phases.reduce((sum: number, p: any) => sum + p.weightage, 0);

    return NextResponse.json({
      phases: phases.map((p: any) => ({
        phaseId: p.phaseId,
        name: p.name,
        description: p.description,
        instructions: p.instructions,
        totalMarks: p.totalMarks,
        deadline: p.deadline,
        status: p.status,
        fypPhase: p.fypPhase,
        cohort: p.cohort,
        isActive: p.isActive,
        orderIndex: p.orderIndex,
        evaluationCount: p._count.submissions > 0 ? 1 : 0, // for backward compatibility/simplicity
        panelCount: p._count.panels,
        submissionsCount: p._count.submissions,
        totalGroups,
        gradedCount: p.submissions.filter((s: any) => s.status === "graded").length,
        createdAt: p.createdAt,
        attachments: p.attachments.map((att: any) => ({
          id: att.attachmentId,
          fileName: att.fileName,
          fileUrl: att.fileUrl,
          fileSize: att.fileSize,
          fileType: att.fileType,
        })),
        submissions: p.submissions.map((sub: any) => ({
          id: sub.submissionId,
          groupId: sub.groupId,
          content: sub.content,
          status: sub.status,
          obtainedMarks: sub.obtainedMarks,
          feedback: sub.feedback,
          submittedAt: sub.submittedAt,
          gradedAt: sub.gradedAt,
          attachments: sub.attachments.map((att: any) => ({
            id: att.attachmentId,
            fileName: att.fileName,
            fileUrl: att.fileUrl,
            fileSize: att.fileSize,
            fileType: att.fileType,
          })),
        })),
      })),
      totalWeightage,
      campusName: coordinator.campus.name,
      totalGroups,
      activeSemester: coordinator.campus.activeSemester,
    });
  } catch (error) {
    console.error("Error fetching phases:", error);
    return NextResponse.json({ error: "Failed to fetch phases" }, { status: 500 });
  }
}

// POST - Create a new phase
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "coordinator") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const body = await req.json();
    const { name, description, weightage, fypPhase, cohort, instructions, totalMarks, deadline, attachments } = body;

    if (!name || weightage === undefined || !fypPhase || !cohort) {
      return NextResponse.json(
        { error: "name, weightage, fypPhase, and cohort are required" },
        { status: 400 }
      );
    }

    const coordinator = await (prisma as any).fYPCoordinator.findFirst({
      where: { userId },
    });

    if (!coordinator) {
      return NextResponse.json({ error: "Coordinator not found" }, { status: 404 });
    }

    // Validate total weightage won't exceed 100
    const existingPhases = await (prisma as any).fypEvaluationPhase.findMany({
      where: {
        campusId: coordinator.campusId,
        cohort: cohort as any,
        fypPhase: fypPhase as any,
      },
    });
    const currentTotal = existingPhases.reduce((sum: number, p: any) => sum + p.weightage, 0);
    if (currentTotal + Number(weightage) > 100.01) {
      return NextResponse.json(
        { error: `Total weightage would exceed 100%. Current total: ${currentTotal.toFixed(1)}%` },
        { status: 400 }
      );
    }

    // Determine next order index
    const maxOrder =
      existingPhases.length > 0
        ? Math.max(...existingPhases.map((p: any) => p.orderIndex))
        : -1;

    const phase = await (prisma as any).fypEvaluationPhase.create({
      data: {
        name,
        description: description || null,
        instructions: instructions || null,
        totalMarks: totalMarks !== undefined ? Number(totalMarks) : 100,
        deadline: deadline ? new Date(deadline) : null,
        status: "active", // default to active as requested/assumed
        fypPhase: fypPhase as any,
        cohort: cohort as any,
        campusId: coordinator.campusId,
        isActive: false,
        orderIndex: maxOrder + 1,
        createdById: userId,
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

    // Create notifications for all students in this cohort on this campus (non-blocking)
    try {
      const students = await prisma.student.findMany({
        where: {
          campusId: coordinator.campusId,
          cohort: cohort as any,
        },
        select: { userId: true },
      });

      if (students.length > 0) {
        const notification = await (prisma as any).notification.create({
          data: {
            title: "New Phase Posted",
            message: `A new phase "${name}" has been announced. Deadline: ${deadline ? new Date(deadline).toLocaleDateString() : "No deadline"}`,
            type: "announcement",
            targetCohort: cohort as any,
            campusId: coordinator.campusId,
          },
        });

        await (prisma as any).notificationRecipient.createMany({
          data: students.map((s: any) => ({
            notificationId: notification.notificationId,
            userId: s.userId,
          })),
        });
      }
    } catch (notificationError) {
      console.error("Error creating notifications (non-blocking):", notificationError);
    }

    return NextResponse.json({ success: true, phase });
  } catch (error) {
    console.error("Error creating phase:", error);
    return NextResponse.json({ error: "Failed to create phase" }, { status: 500 });
  }
}

// PATCH - Update a phase or grade submission
export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "coordinator") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const body = await req.json();
    const { phaseId, submissionId, action, name, description, weightage, instructions, totalMarks, deadline, status } = body;

    const coordinator = await (prisma as any).fYPCoordinator.findFirst({
      where: { userId },
    });
    if (!coordinator) {
      return NextResponse.json({ error: "Coordinator not found" }, { status: 404 });
    }

    // If grading a submission
    if (action === "grade" && submissionId) {
      const { obtainedMarks, feedback } = body;

      if (obtainedMarks === undefined) {
        return NextResponse.json({ error: "Marks are required" }, { status: 400 });
      }

      const submission = await (prisma as any).evaluationSubmission.update({
        where: { submissionId: parseInt(submissionId) },
        data: {
          obtainedMarks: parseInt(obtainedMarks),
          feedback: feedback || null,
          status: "graded",
          gradedById: userId,
          gradedAt: new Date(),
        },
      });

      return NextResponse.json({ success: true, submission });
    }

    if (!phaseId) {
      return NextResponse.json({ error: "phaseId is required" }, { status: 400 });
    }

    // Fetch the phase to confirm ownership
    const existing = await (prisma as any).fypEvaluationPhase.findUnique({
      where: { phaseId: parseInt(phaseId) },
    });
    if (!existing || existing.campusId !== coordinator.campusId) {
      return NextResponse.json({ error: "Phase not found" }, { status: 404 });
    }

    if (action === "activate") {
      // Deactivate all other phases in the same FYP+cohort, then activate this one
      await (prisma as any).fypEvaluationPhase.updateMany({
        where: {
          campusId: coordinator.campusId,
          fypPhase: existing.fypPhase,
          cohort: existing.cohort,
        },
        data: { isActive: false },
      });

      const phase = await (prisma as any).fypEvaluationPhase.update({
        where: { phaseId: parseInt(phaseId) },
        data: { isActive: true },
      });

      return NextResponse.json({ success: true, phase });
    }

    if (action === "deactivate") {
      const phase = await (prisma as any).fypEvaluationPhase.update({
        where: { phaseId: parseInt(phaseId) },
        data: { isActive: false },
      });
      return NextResponse.json({ success: true, phase });
    }

    if (action === "updateStatus") {
      const phase = await (prisma as any).fypEvaluationPhase.update({
        where: { phaseId: parseInt(phaseId) },
        data: { status: status as any },
      });
      return NextResponse.json({ success: true, phase });
    }

    // General update
    if (weightage !== undefined) {
      // Validate new total
      const siblings = await (prisma as any).fypEvaluationPhase.findMany({
        where: {
          campusId: coordinator.campusId,
          fypPhase: existing.fypPhase,
          cohort: existing.cohort,
          phaseId: { not: parseInt(phaseId) },
        },
      });
      const othersTotal = siblings.reduce((sum: number, p: any) => sum + p.weightage, 0);
      if (othersTotal + Number(weightage) > 100.01) {
        return NextResponse.json(
          { error: `Total weightage would exceed 100%. Other phases total: ${othersTotal.toFixed(1)}%` },
          { status: 400 }
        );
      }
    }

    const phase = await (prisma as any).fypEvaluationPhase.update({
      where: { phaseId: parseInt(phaseId) },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description: description || null }),
        ...(weightage !== undefined && { weightage: Number(weightage) }),
        ...(instructions !== undefined && { instructions: instructions || null }),
        ...(totalMarks !== undefined && { totalMarks: Number(totalMarks) }),
        ...(deadline !== undefined && { deadline: deadline ? new Date(deadline) : null }),
        ...(status !== undefined && { status: status as any }),
      },
    });

    return NextResponse.json({ success: true, phase });
  } catch (error) {
    console.error("Error updating phase:", error);
    return NextResponse.json({ error: "Failed to update phase" }, { status: 500 });
  }
}

// DELETE - Delete a phase (only if no submissions or panels linked)
export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "coordinator") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const { searchParams } = new URL(req.url);
    const phaseId = searchParams.get("phaseId");

    if (!phaseId) {
      return NextResponse.json({ error: "phaseId is required" }, { status: 400 });
    }

    const coordinator = await (prisma as any).fYPCoordinator.findFirst({
      where: { userId },
    });
    if (!coordinator) {
      return NextResponse.json({ error: "Coordinator not found" }, { status: 404 });
    }

    const existing = await (prisma as any).fypEvaluationPhase.findUnique({
      where: { phaseId: parseInt(phaseId) },
      include: {
        _count: { select: { submissions: true, panels: true } },
      },
    });

    if (!existing || existing.campusId !== coordinator.campusId) {
      return NextResponse.json({ error: "Phase not found" }, { status: 404 });
    }

    if (existing._count.submissions > 0 || existing._count.panels > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete phase with linked submissions (${existing._count.submissions}) or panels (${existing._count.panels}). Unlink or delete them first.`,
        },
        { status: 400 }
      );
    }

    await (prisma as any).fypEvaluationPhase.delete({
      where: { phaseId: parseInt(phaseId) },
    });

    return NextResponse.json({ success: true, message: "Phase deleted" });
  } catch (error) {
    console.error("Error deleting phase:", error);
    return NextResponse.json({ error: "Failed to delete phase" }, { status: 500 });
  }
}
