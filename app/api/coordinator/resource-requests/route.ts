import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// GET - Fetch all resource requests forwarded to coordinator (supervisor_approved)
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "coordinator") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = parseInt(session.user.id);

    const coordinator = await prisma.fYPCoordinator.findUnique({
      where: { userId },
    });

    if (!coordinator) {
      return NextResponse.json({ error: "Coordinator not found" }, { status: 404 });
    }

    // Get all requests from groups in this campus that have been approved by supervisor
    const requests = await (prisma as any).resourceRequest.findMany({
      where: {
        campusId: coordinator.campusId,
        status: {
          in: ["supervisor_approved", "coordinator_review", "meeting_scheduled", "approved", "rejected"],
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Get group names
    const groupIds = Array.from(new Set(requests.map((r: any) => r.groupId))) as number[];
    const groups = groupIds.length > 0 ? await prisma.group.findMany({
      where: { groupId: { in: groupIds } },
      select: { groupId: true, groupName: true },
    }) : [];
    const groupMap = new Map(groups.map(g => [g.groupId, g.groupName]));

    // Get creator & supervisor names
    const userIds = Array.from(new Set([
      ...requests.map((r: any) => r.createdById),
      ...requests.filter((r: any) => r.supervisorId).map((r: any) => r.supervisorId),
    ])) as number[];

    const users = userIds.length > 0 ? await prisma.user.findMany({
      where: { userId: { in: userIds } },
      select: { userId: true, name: true },
    }) : [];
    const userMap = new Map(users.map(u => [u.userId, u.name]));

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
      createdBy: userMap.get(r.createdById) || "Unknown",
      createdAt: r.createdAt,
      supervisorNote: r.supervisorNote,
      supervisorAction: r.supervisorAction,
      supervisorName: r.supervisorId ? userMap.get(r.supervisorId) : null,
      supervisorReviewedAt: r.supervisorReviewedAt,
      coordinatorNote: r.coordinatorNote,
      meetingDate: r.meetingDate,
      meetingTime: r.meetingTime,
      meetingLink: r.meetingLink,
      meetingVenue: r.meetingVenue,
      meetingType: r.meetingType,
      coordinatorReviewedAt: r.coordinatorReviewedAt,
    }));

    return NextResponse.json({ requests: formatted });
  } catch (error) {
    console.error("Error fetching resource requests:", error);
    return NextResponse.json({ error: "Failed to fetch resource requests" }, { status: 500 });
  }
}

// POST - Coordinator action: schedule meeting, approve, or reject
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "coordinator") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const body = await req.json();
    const { requestId, action, note, meetingDate, meetingTime, meetingLink, meetingVenue, meetingType } = body;

    if (!requestId || !action) {
      return NextResponse.json({ error: "Request ID and action are required" }, { status: 400 });
    }

    if (!["schedule_meeting", "approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const request = await (prisma as any).resourceRequest.findUnique({
      where: { id: parseInt(requestId) },
    });

    if (!request) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    let updateData: any = {
      coordinatorId: userId,
      coordinatorNote: note || null,
      coordinatorReviewedAt: new Date(),
    };

    if (action === "schedule_meeting") {
      if (!meetingDate) {
        return NextResponse.json({ error: "Meeting date is required" }, { status: 400 });
      }
      updateData.status = "meeting_scheduled";
      updateData.meetingDate = new Date(meetingDate);
      updateData.meetingTime = meetingTime || null;
      updateData.meetingLink = meetingLink || null;
      updateData.meetingVenue = meetingVenue || null;
      updateData.meetingType = meetingType || "physical";

      // Also create a meeting in the meetings table for the group's dashboard
      await prisma.meeting.create({
        data: {
          groupId: request.groupId,
          title: `Resource Review: ${request.title}`,
          description: `Meeting to discuss resource request: ${request.title}${note ? `\n\nCoordinator Note: ${note}` : ''}`,
          meetingLink: meetingLink || null,
          scheduledAt: new Date(meetingDate),
          duration: 30,
          status: "scheduled",
          createdById: userId,
          createdByRole: "coordinator",
        },
      });
    } else if (action === "approve") {
      updateData.status = "approved";
    } else if (action === "reject") {
      updateData.status = "rejected";
    }

    const updated = await (prisma as any).resourceRequest.update({
      where: { id: parseInt(requestId) },
      data: updateData,
    });

    return NextResponse.json({ success: true, request: updated });
  } catch (error) {
    console.error("Error processing resource request:", error);
    return NextResponse.json({ error: "Failed to process resource request" }, { status: 500 });
  }
}
