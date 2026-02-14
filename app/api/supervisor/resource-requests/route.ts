import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// GET - Fetch resource requests for supervisor's groups
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "supervisor") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = parseInt(session.user.id);

    // Find groups supervised by this user
    const groups = await prisma.group.findMany({
      where: { supervisorId: userId },
      select: { groupId: true, groupName: true },
    });

    const groupIds = groups.map(g => g.groupId);
    const groupMap = new Map(groups.map(g => [g.groupId, g.groupName]));

    if (groupIds.length === 0) {
      return NextResponse.json({ requests: [] });
    }

    const requests = await (prisma as any).resourceRequest.findMany({
      where: { groupId: { in: groupIds } },
      orderBy: { createdAt: "desc" },
    });

    // Get creator names
    const creatorIds = Array.from(new Set(requests.map((r: any) => r.createdById))) as number[];
    const creators = await prisma.user.findMany({
      where: { userId: { in: creatorIds } },
      select: { userId: true, name: true },
    });
    const creatorMap = new Map(creators.map(c => [c.userId, c.name]));

    const formatted = requests.map((r: any) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      resourceType: r.resourceType,
      items: JSON.parse(r.items || "[]"),
      justification: r.justification,
      status: r.status,
      groupId: r.groupId,
      groupName: groupMap.get(r.groupId) || `Group ${r.groupId}`,
      createdBy: creatorMap.get(r.createdById) || "Unknown",
      createdAt: r.createdAt,
      supervisorNote: r.supervisorNote,
      supervisorAction: r.supervisorAction,
      supervisorReviewedAt: r.supervisorReviewedAt,
      coordinatorNote: r.coordinatorNote,
      meetingDate: r.meetingDate,
      meetingTime: r.meetingTime,
      meetingLink: r.meetingLink,
      meetingVenue: r.meetingVenue,
      meetingType: r.meetingType,
    }));

    return NextResponse.json({ requests: formatted });
  } catch (error) {
    console.error("Error fetching resource requests:", error);
    return NextResponse.json({ error: "Failed to fetch resource requests" }, { status: 500 });
  }
}

// POST - Review a resource request (approve/reject/forward to coordinator)
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "supervisor") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const body = await req.json();
    const { requestId, action, note } = body;

    if (!requestId || !action) {
      return NextResponse.json({ error: "Request ID and action are required" }, { status: 400 });
    }

    if (!["approved", "rejected"].includes(action)) {
      return NextResponse.json({ error: "Invalid action. Use 'approved' or 'rejected'" }, { status: 400 });
    }

    const request = await (prisma as any).resourceRequest.findUnique({
      where: { id: parseInt(requestId) },
    });

    if (!request) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    // Verify this supervisor supervises the group
    const group = await prisma.group.findFirst({
      where: { groupId: request.groupId, supervisorId: userId },
    });

    if (!group) {
      return NextResponse.json({ error: "You don't supervise this group" }, { status: 403 });
    }

    if (request.status !== "pending") {
      return NextResponse.json({ error: "Request has already been reviewed" }, { status: 400 });
    }

    const newStatus = action === "approved" ? "supervisor_approved" : "supervisor_rejected";

    const updated = await (prisma as any).resourceRequest.update({
      where: { id: parseInt(requestId) },
      data: {
        status: newStatus,
        supervisorId: userId,
        supervisorNote: note || null,
        supervisorAction: action,
        supervisorReviewedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, request: updated });
  } catch (error) {
    console.error("Error reviewing resource request:", error);
    return NextResponse.json({ error: "Failed to review resource request" }, { status: 500 });
  }
}
