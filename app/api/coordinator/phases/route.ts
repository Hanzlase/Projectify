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
        _count: {
          select: {
            evaluations: true,
            panels: true,
          },
        },
      },
      orderBy: { orderIndex: "asc" },
    });

    // Compute total weightage for this FYP+cohort
    const totalWeightage = phases.reduce((sum: number, p: any) => sum + p.weightage, 0);

    return NextResponse.json({
      phases: phases.map((p: any) => ({
        phaseId: p.phaseId,
        name: p.name,
        description: p.description,
        weightage: p.weightage,
        fypPhase: p.fypPhase,
        cohort: p.cohort,
        isActive: p.isActive,
        orderIndex: p.orderIndex,
        evaluationCount: p._count.evaluations,
        panelCount: p._count.panels,
        createdAt: p.createdAt,
      })),
      totalWeightage,
      campusName: coordinator.campus.name,
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
    const { name, description, weightage, fypPhase, cohort } = body;

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
        weightage: Number(weightage),
        fypPhase: fypPhase as any,
        cohort: cohort as any,
        campusId: coordinator.campusId,
        isActive: false,
        orderIndex: maxOrder + 1,
        createdById: userId,
      },
    });

    return NextResponse.json({ success: true, phase });
  } catch (error) {
    console.error("Error creating phase:", error);
    return NextResponse.json({ error: "Failed to create phase" }, { status: 500 });
  }
}

// PATCH - Update a phase (name, description, weightage, activate, reorder)
export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "coordinator") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const body = await req.json();
    const { phaseId, action, name, description, weightage } = body;

    if (!phaseId) {
      return NextResponse.json({ error: "phaseId is required" }, { status: 400 });
    }

    const coordinator = await (prisma as any).fYPCoordinator.findFirst({
      where: { userId },
    });
    if (!coordinator) {
      return NextResponse.json({ error: "Coordinator not found" }, { status: 404 });
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
      },
    });

    return NextResponse.json({ success: true, phase });
  } catch (error) {
    console.error("Error updating phase:", error);
    return NextResponse.json({ error: "Failed to update phase" }, { status: 500 });
  }
}

// DELETE - Delete a phase (only if no evaluations or panels linked)
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
        _count: { select: { evaluations: true, panels: true } },
      },
    });

    if (!existing || existing.campusId !== coordinator.campusId) {
      return NextResponse.json({ error: "Phase not found" }, { status: 404 });
    }

    if (existing._count.evaluations > 0 || existing._count.panels > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete phase with linked evaluations (${existing._count.evaluations}) or panels (${existing._count.panels}). Unlink them first.`,
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
