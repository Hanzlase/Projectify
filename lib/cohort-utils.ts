import { Cohort, Semester, FypPhase } from "@prisma/client";
import { prisma } from "./prisma";

/**
 * Resolves the active FYP phase (FYP_1 or FYP_2) based on the cohort and active semester.
 * 
 * FALL:
 * - REGULAR -> FYP_1
 * - DELAYED -> FYP_2
 * 
 * SPRING:
 * - REGULAR -> FYP_2
 * - DELAYED -> FYP_1
 */
export function getActivePhase(cohort: Cohort, semester: Semester): FypPhase {
  if (semester === Semester.FALL) {
    return cohort === Cohort.REGULAR ? FypPhase.FYP_1 : FypPhase.FYP_2;
  } else {
    return cohort === Cohort.REGULAR ? FypPhase.FYP_2 : FypPhase.FYP_1;
  }
}

/**
 * Automatically determines if a student has completed their FYP (both FYP-1 and FYP-2).
 * Under these conditions, the student is placed in Read-Only / Portfolio Mode.
 */
export async function isStudentCompleted(userId: number): Promise<boolean> {
  try {
    const student = await prisma.student.findUnique({
      where: { userId },
      include: {
        campus: true,
        group: true,
      },
    });

    if (!student || !student.group) {
      return false;
    }

    // 1. Check if the group has an associated project which is completed or archived
    if (student.group.projectId) {
      const project = await prisma.project.findUnique({
        where: { projectId: student.group.projectId },
      });
      if (project && (project.status === "completed" || project.status === "archived")) {
        return true;
      }
    }

    // Also look up project by groupId to be safe
    const projectByGroup = await prisma.project.findFirst({
      where: { groupId: student.group.groupId },
    });
    if (projectByGroup && (projectByGroup.status === "completed" || projectByGroup.status === "archived")) {
      return true;
    }

    // 2. Check active semester cohort phase logic
    // If the group's record has fypPhase === 'FYP_2' on disk, but the current campus activeSemester
    // resolves their cohort back to 'FYP_1' (indicating they have already traversed both phases).
    if (student.group.fypPhase === FypPhase.FYP_2) {
      const activePhase = getActivePhase(student.cohort, student.campus.activeSemester);
      if (activePhase === FypPhase.FYP_1) {
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error("Error in isStudentCompleted helper:", error);
    return false;
  }
}

/**
 * Automatically determines if a group has completed their FYP (both FYP-1 and FYP-2).
 */
export async function isGroupCompleted(groupId: number): Promise<boolean> {
  try {
    const group = await prisma.group.findUnique({
      where: { groupId },
      include: {
        students: {
          include: {
            campus: true,
          },
        },
      },
    });

    if (!group) {
      return false;
    }

    // 1. Check if the group has an associated project which is completed or archived
    if (group.projectId) {
      const project = await prisma.project.findUnique({
        where: { projectId: group.projectId },
      });
      if (project && (project.status === "completed" || project.status === "archived")) {
        return true;
      }
    }

    // Also look up project by groupId to be safe
    const projectByGroup = await prisma.project.findFirst({
      where: { groupId: group.groupId },
    });
    if (projectByGroup && (projectByGroup.status === "completed" || projectByGroup.status === "archived")) {
      return true;
    }

    // 2. Check active semester cohort phase logic
    if (group.fypPhase === FypPhase.FYP_2 && group.students.length > 0) {
      const student = group.students[0];
      const activePhase = getActivePhase(group.cohort, student.campus.activeSemester);
      if (activePhase === FypPhase.FYP_1) {
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error("Error in isGroupCompleted helper:", error);
    return false;
  }
}


