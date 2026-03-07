import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// GET - Fetch panel comments for the student's group
// Query params: panelId (required)
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "student") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const { searchParams } = new URL(req.url);
    const panelId = searchParams.get("panelId");

    if (!panelId) {
      return NextResponse.json({ error: "panelId is required" }, { status: 400 });
    }

    // Get student's group
    const student = await prisma.student.findUnique({ where: { userId } });

    if (!student || !student.groupId) {
      return NextResponse.json({ comments: [] });
    }

    // Verify student's group is assigned to this panel
    const assignment = await prisma.groupPanelAssignment.findUnique({
      where: {
        panelId_groupId: {
          panelId: parseInt(panelId),
          groupId: student.groupId,
        },
      },
      include: {
        comments: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!assignment) {
      return NextResponse.json({ comments: [] });
    }

    // Get commenter user details
    const commentUserIds = (assignment.comments || []).map((c: any) => c.userId);
    const commentUsers = await prisma.user.findMany({
      where: { userId: { in: commentUserIds } },
      select: { userId: true, name: true, profileImage: true },
    });
    const userMap = new Map(commentUsers.map((u) => [u.userId, u]));

    const comments = (assignment.comments || []).map((c: any) => ({
      commentId: c.commentId,
      content: c.content,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      userId: c.userId,
      userName: userMap.get(c.userId)?.name || "Unknown",
      userImage: userMap.get(c.userId)?.profileImage || null,
    }));

    return NextResponse.json({ comments });
  } catch (error) {
    console.error("Error fetching panel comments:", error);
    return NextResponse.json({ error: "Failed to fetch comments" }, { status: 500 });
  }
}
