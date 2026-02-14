import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// GET - Fetch resource requests for student's group
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "student") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = parseInt(session.user.id);

    const student = await prisma.student.findUnique({
      where: { userId },
    });

    if (!student || !student.groupId) {
      return NextResponse.json({ error: "You must be in a group" }, { status: 400 });
    }

    const requests = await (prisma as any).resourceRequest.findMany({
      where: { groupId: student.groupId },
      orderBy: { createdAt: "desc" },
    });

    // Get creator names
    const creatorIds = Array.from(new Set(requests.map((r: any) => r.createdById))) as number[];
    const creators = await prisma.user.findMany({
      where: { userId: { in: creatorIds as number[] } },
      select: { userId: true, name: true },
    });
    const creatorMap = new Map(creators.map(c => [c.userId, c.name]));

    // Get supervisor name if reviewed
    const supervisorIds = requests.filter((r: any) => r.supervisorId).map((r: any) => r.supervisorId);
    const supervisors = supervisorIds.length > 0 ? await prisma.user.findMany({
      where: { userId: { in: supervisorIds } },
      select: { userId: true, name: true },
    }) : [];
    const supervisorMap = new Map(supervisors.map(s => [s.userId, s.name]));

    const formatted = requests.map((r: any) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      resourceType: r.resourceType,
      items: JSON.parse(r.items || "[]"),
      justification: r.justification,
      status: r.status,
      createdBy: creatorMap.get(r.createdById) || "Unknown",
      createdAt: r.createdAt,
      supervisorNote: r.supervisorNote,
      supervisorAction: r.supervisorAction,
      supervisorName: r.supervisorId ? supervisorMap.get(r.supervisorId) : null,
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

// POST - Create a new resource request
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "student") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const body = await req.json();
    const { title, description, resourceType, items, justification } = body;

    if (!title || !items || items.length === 0) {
      return NextResponse.json({ error: "Title and items are required" }, { status: 400 });
    }

    const student = await prisma.student.findUnique({
      where: { userId },
    });

    if (!student || !student.groupId) {
      return NextResponse.json({ error: "You must be in a group" }, { status: 400 });
    }

    const request = await (prisma as any).resourceRequest.create({
      data: {
        groupId: student.groupId,
        title,
        description: description || null,
        resourceType: resourceType || "hardware",
        items: JSON.stringify(items),
        justification: justification || null,
        status: "pending",
        createdById: userId,
        campusId: student.campusId,
      },
    });

    return NextResponse.json({ success: true, request });
  } catch (error) {
    console.error("Error creating resource request:", error);
    return NextResponse.json({ error: "Failed to create resource request" }, { status: 500 });
  }
}

// PATCH - Update a resource request (only if still pending)
export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "student") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const body = await req.json();
    const { requestId, title, description, resourceType, items, justification } = body;

    if (!requestId) {
      return NextResponse.json({ error: "Request ID is required" }, { status: 400 });
    }

    const student = await prisma.student.findUnique({
      where: { userId },
    });

    if (!student || !student.groupId) {
      return NextResponse.json({ error: "You must be in a group" }, { status: 400 });
    }

    const existing = await (prisma as any).resourceRequest.findUnique({
      where: { id: parseInt(requestId) },
    });

    if (!existing || existing.groupId !== student.groupId) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    if (existing.status !== "pending") {
      return NextResponse.json({ error: "Can only edit pending requests" }, { status: 400 });
    }

    const updated = await (prisma as any).resourceRequest.update({
      where: { id: parseInt(requestId) },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(resourceType && { resourceType }),
        ...(items && { items: JSON.stringify(items) }),
        ...(justification !== undefined && { justification }),
      },
    });

    return NextResponse.json({ success: true, request: updated });
  } catch (error) {
    console.error("Error updating resource request:", error);
    return NextResponse.json({ error: "Failed to update resource request" }, { status: 500 });
  }
}

// DELETE - Delete a resource request (only if still pending)
export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "student") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const { searchParams } = new URL(req.url);
    const requestId = searchParams.get("id");

    if (!requestId) {
      return NextResponse.json({ error: "Request ID is required" }, { status: 400 });
    }

    const student = await prisma.student.findUnique({
      where: { userId },
    });

    if (!student || !student.groupId) {
      return NextResponse.json({ error: "You must be in a group" }, { status: 400 });
    }

    const existing = await (prisma as any).resourceRequest.findUnique({
      where: { id: parseInt(requestId) },
    });

    if (!existing || existing.groupId !== student.groupId) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    if (existing.status !== "pending") {
      return NextResponse.json({ error: "Can only delete pending requests" }, { status: 400 });
    }

    await (prisma as any).resourceRequest.delete({
      where: { id: parseInt(requestId) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting resource request:", error);
    return NextResponse.json({ error: "Failed to delete resource request" }, { status: 500 });
  }
}
