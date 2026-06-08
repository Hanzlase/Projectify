import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/coordinator/fyp-scores
 *
 * Returns per-group weighted FYP totals for the coordinator's campus.
 * For each group, for each FYP (FYP_1 / FYP_2):
 *   FYP_total = Σ (phase.weightage/100 × phase_combined_score)
 * where phase_combined_score = supervisorScore × 45% + panelScore × 55%
 * for all submissions linked to evaluations in that phase.
 *
 * Supports filtering by cohort (REGULAR | DELAYED).
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "coordinator") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const { searchParams } = new URL(req.url);
    const cohort = (searchParams.get("cohort") || "REGULAR") as "REGULAR" | "DELAYED";

    const coordinator = await (prisma as any).fYPCoordinator.findFirst({
      where: { userId },
      include: { campus: true },
    });

    if (!coordinator) {
      return NextResponse.json({ error: "Coordinator not found" }, { status: 404 });
    }

    const campusId: number = coordinator.campusId;
    const activeSemester: string = coordinator.campus.activeSemester;

    // Fetch all phases for this campus+cohort (both FYP_1 and FYP_2)
    const allPhases = await (prisma as any).fypEvaluationPhase.findMany({
      where: { campusId, cohort: cohort as any },
      orderBy: [{ fypPhase: "asc" }, { orderIndex: "asc" }],
    });

    // Fetch all phases for this campus+cohort (with submissions)
    const phasesWithSubmissions = await (prisma as any).fypEvaluationPhase.findMany({
      where: {
        campusId,
        cohort: cohort as any,
      },
      include: {
        submissions: {
          select: {
            submissionId: true,
            groupId: true,
            supervisorScore: true,
            panelScore: true,
            obtainedMarks: true,
            status: true,
          },
        },
      },
    });

    // Fetch all groups for this campus+cohort
    const groups = await (prisma as any).group.findMany({
      where: {
        cohort: cohort as any,
        students: { some: { campusId } },
      },
      include: {
        students: {
          select: {
            userId: true,
            user: { select: { name: true } },
            rollNumber: true,
          },
        },
      },
    });

    // Build a map: groupId → { FYP_1: { phaseId: combinedScore }, FYP_2: { ... } }
    // Step 1: collect all submissions grouped by (groupId, phaseId)
    type PhaseScore = {
      supervisorScores: number[];
      panelScores: number[];
      totalMarks: number;
      phaseName: string;
      weightage: number;
      fypPhase: string;
    };

    const groupPhaseMap = new Map<number, Map<number, PhaseScore>>();

    for (const ph of phasesWithSubmissions) {
      const phaseId = ph.phaseId;
      const phaseName = ph.name;
      const weightage = ph.weightage;
      const fypPhase = ph.fypPhase;
      const totalMarks = ph.totalMarks;

      for (const sub of ph.submissions) {
        const { groupId, supervisorScore, panelScore } = sub;

        if (!groupPhaseMap.has(groupId)) {
          groupPhaseMap.set(groupId, new Map());
        }
        const phaseMap = groupPhaseMap.get(groupId)!;

        if (!phaseMap.has(phaseId)) {
          phaseMap.set(phaseId, {
            supervisorScores: [],
            panelScores: [],
            totalMarks,
            phaseName,
            weightage,
            fypPhase,
          });
        }

        const entry = phaseMap.get(phaseId)!;
        if (supervisorScore !== null && supervisorScore !== undefined) {
          entry.supervisorScores.push(supervisorScore);
        }
        if (panelScore !== null && panelScore !== undefined) {
          entry.panelScores.push(panelScore);
        }
      }
    }

    // Step 2: for each group, compute weighted FYP totals
    const groupScores = groups.map((group: any) => {
      const phaseMap = groupPhaseMap.get(group.groupId) || new Map();

      // Phases grouped by fypPhase
      const fyp1Phases = allPhases.filter((p: any) => p.fypPhase === "FYP_1");
      const fyp2Phases = allPhases.filter((p: any) => p.fypPhase === "FYP_2");

      const computeFypScore = (phases: any[]) => {
        if (phases.length === 0) return null;

        const totalWeightage = phases.reduce((s: number, p: any) => s + p.weightage, 0);
        if (totalWeightage === 0) return null;

        let weightedSum = 0;
        let coveredWeightage = 0;
        const phaseBreakdown: any[] = [];

        for (const phase of phases) {
          const entry = phaseMap.get(phase.phaseId);
          if (!entry) {
            phaseBreakdown.push({
              phaseId: phase.phaseId,
              name: phase.name,
              weightage: phase.weightage,
              combinedScore: null,
              combinedPct: null,
            });
            continue;
          }

          const avgSupScore =
            entry.supervisorScores.length > 0
              ? entry.supervisorScores.reduce((a: number, b: number) => a + b, 0) /
                entry.supervisorScores.length
              : null;

          const avgPanelScore =
            entry.panelScores.length > 0
              ? entry.panelScores.reduce((a: number, b: number) => a + b, 0) /
                entry.panelScores.length
              : null;

          let combinedScore: number | null = null;
          if (avgSupScore !== null && avgPanelScore !== null) {
            combinedScore = (avgSupScore * 0.45) + (avgPanelScore * 0.55);
          } else if (avgSupScore !== null) {
            combinedScore = avgSupScore;
          } else if (avgPanelScore !== null) {
            combinedScore = avgPanelScore;
          }

          const combinedPct =
            combinedScore !== null ? (combinedScore / entry.totalMarks) * 100 : null;

          phaseBreakdown.push({
            phaseId: phase.phaseId,
            name: phase.name,
            weightage: phase.weightage,
            combinedScore,
            combinedPct: combinedPct !== null ? Math.round(combinedPct * 10) / 10 : null,
            supervisorScore: avgSupScore !== null ? Math.round(avgSupScore * 10) / 10 : null,
            panelScore: avgPanelScore !== null ? Math.round(avgPanelScore * 10) / 10 : null,
            totalMarks: entry.totalMarks,
          });

          if (combinedPct !== null) {
            weightedSum += (phase.weightage / 100) * combinedPct;
            coveredWeightage += phase.weightage;
          }
        }

        const isComplete = coveredWeightage >= totalWeightage - 0.01;
        const totalScore = isComplete ? Math.round(weightedSum * 10) / 10 : null;

        return {
          totalScore,         // null if not all phases scored
          partialScore: Math.round(weightedSum * 10) / 10,
          coveredWeightage,
          totalWeightage,
          isComplete,
          phaseBreakdown,
        };
      };

      const fyp1Score = computeFypScore(fyp1Phases);
      const fyp2Score = computeFypScore(fyp2Phases);

      return {
        groupId: group.groupId,
        groupName: group.groupName || `Group ${group.groupId}`,
        cohort: group.cohort,
        fypPhase: group.fypPhase,
        students: group.students.map((s: any) => ({
          name: s.user?.name || "Unknown",
          rollNumber: s.rollNumber,
        })),
        fyp1: fyp1Score,
        fyp2: fyp2Score,
      };
    });

    // Phase summary
    const fyp1Phases = allPhases.filter((p: any) => p.fypPhase === "FYP_1");
    const fyp2Phases = allPhases.filter((p: any) => p.fypPhase === "FYP_2");

    return NextResponse.json({
      groupScores,
      campusName: coordinator.campus.name,
      activeSemester,
      cohort,
      phases: {
        FYP_1: fyp1Phases.map((p: any) => ({
          phaseId: p.phaseId,
          name: p.name,
          weightage: p.weightage,
          isActive: p.isActive,
          orderIndex: p.orderIndex,
        })),
        FYP_2: fyp2Phases.map((p: any) => ({
          phaseId: p.phaseId,
          name: p.name,
          weightage: p.weightage,
          isActive: p.isActive,
          orderIndex: p.orderIndex,
        })),
      },
    });
  } catch (error) {
    console.error("Error computing FYP scores:", error);
    return NextResponse.json({ error: "Failed to compute FYP scores" }, { status: 500 });
  }
}
