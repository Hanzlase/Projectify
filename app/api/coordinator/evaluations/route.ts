import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// GET - Fetch all evaluations for coordinator's campus
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "coordinator") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = parseInt(session.user.id);

    // Get coordinator's campus
    const coordinator = await (prisma as any).fYPCoordinator.findFirst({
      where: { userId },
      include: { campus: true },
    });

    if (!coordinator) {
      return NextResponse.json({ error: "Coordinator not found" }, { status: 404 });
    }

    // Fetch evaluations with submissions count
    const evaluations = await (prisma as any).evaluation.findMany({
      where: { campusId: coordinator.campusId },
      include: {
        attachments: true,
        submissions: {
          include: {
            attachments: true,
          },
        },
        _count: {
          select: { submissions: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Get total groups count for campus
    const totalGroups = await (prisma as any).group.count({
      where: {
        students: {
          some: {
            campusId: coordinator.campusId,
          },
        },
      },
    });

    // Format evaluations with stats
    const formattedEvaluations = evaluations.map((ev: any) => ({
      id: ev.evaluationId,
      title: ev.title,
      description: ev.description,
      instructions: ev.instructions,
      totalMarks: ev.totalMarks,
      dueDate: ev.dueDate,
      status: ev.status,
      createdAt: ev.createdAt,
      attachments: ev.attachments.map((att: any) => ({
        id: att.attachmentId,
        fileName: att.fileName,
        fileUrl: att.fileUrl,
        fileSize: att.fileSize,
        fileType: att.fileType,
      })),
      submissionsCount: ev._count.submissions,
      totalGroups,
      gradedCount: ev.submissions.filter((s: any) => s.status === "graded").length,
      submissions: ev.submissions.map((sub: any) => ({
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
    }));

    return NextResponse.json({
      evaluations: formattedEvaluations,
      campusName: coordinator.campus.name,
      totalGroups,
    });
  } catch (error) {
    console.error("Error fetching evaluations:", error);
    return NextResponse.json({ error: "Failed to fetch evaluations" }, { status: 500 });
  }
}

// POST - Create a new evaluation
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "coordinator") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const body = await req.json();
    const { title, description, instructions, totalMarks, dueDate, attachments } = body;

    if (!title || !description || !dueDate) {
      return NextResponse.json({ error: "Title, description, and due date are required" }, { status: 400 });
    }

    // Get coordinator's campus
    const coordinator = await (prisma as any).fYPCoordinator.findFirst({
      where: { userId },
    });

    if (!coordinator) {
      return NextResponse.json({ error: "Coordinator not found" }, { status: 404 });
    }

    // Create evaluation with attachments
    const evaluation = await (prisma as any).evaluation.create({
      data: {
        title,
        description,
        instructions: instructions || null,
        totalMarks: totalMarks || 100,
        dueDate: new Date(dueDate),
        status: "active",
        createdById: userId,
        campusId: coordinator.campusId,
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

    // Create notification for all students in the campus (non-blocking)
    try {
      const students = await prisma.student.findMany({
        where: { campusId: coordinator.campusId },
        select: { userId: true },
      });

      if (students.length > 0) {
        const notification = await (prisma as any).notification.create({
          data: {
            title: "New Evaluation Posted",
            message: `A new evaluation "${title}" has been posted. Due date: ${new Date(dueDate).toLocaleDateString()}`,
            type: "info",
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

    return NextResponse.json({
      success: true,
      evaluation: {
        id: evaluation.evaluationId,
        title: evaluation.title,
        description: evaluation.description,
        dueDate: evaluation.dueDate,
        status: evaluation.status,
        attachments: evaluation.attachments,
      },
    });
  } catch (error) {
    console.error("Error creating evaluation:", error);
    return NextResponse.json({ error: "Failed to create evaluation" }, { status: 500 });
  }
}

// PATCH - Update evaluation or grade submission
export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "coordinator") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const body = await req.json();
    const { evaluationId, submissionId, action, ...data } = body;

    if (action === "grade" && submissionId) {
      // Grade a submission
      const { obtainedMarks, feedback } = data;

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

    if (action === "updateStatus" && evaluationId) {
      // Update evaluation status
      const { status } = data;

      const evaluation = await (prisma as any).evaluation.update({
        where: { evaluationId: parseInt(evaluationId) },
        data: { status },
      });

      return NextResponse.json({ success: true, evaluation });
    }

    if (evaluationId) {
      // Update evaluation details
      const { title, description, instructions, totalMarks, dueDate } = data;

      const evaluation = await (prisma as any).evaluation.update({
        where: { evaluationId: parseInt(evaluationId) },
        data: {
          ...(title && { title }),
          ...(description && { description }),
          ...(instructions !== undefined && { instructions }),
          ...(totalMarks && { totalMarks: parseInt(totalMarks) }),
          ...(dueDate && { dueDate: new Date(dueDate) }),
        },
      });

      return NextResponse.json({ success: true, evaluation });
    }

    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  } catch (error) {
    console.error("Error updating evaluation:", error);
    return NextResponse.json({ error: "Failed to update evaluation" }, { status: 500 });
  }
}

// DELETE - Delete an evaluation
export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "coordinator") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const evaluationId = searchParams.get("evaluationId");

    if (!evaluationId) {
      return NextResponse.json({ error: "Evaluation ID is required" }, { status: 400 });
    }

    await (prisma as any).evaluation.delete({
      where: { evaluationId: parseInt(evaluationId) },
    });

    return NextResponse.json({ success: true, message: "Evaluation deleted" });
  } catch (error) {
    console.error("Error deleting evaluation:", error);
    return NextResponse.json({ error: "Failed to delete evaluation" }, { status: 500 });
  }
}
