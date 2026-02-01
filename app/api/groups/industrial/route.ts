import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

// POST - Create a group based on an approved industrial project
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    if (session.user.role !== 'student') {
      return NextResponse.json({ error: 'Only students can create groups' }, { status: 403 });
    }
    
    const userId = parseInt(session.user.id);
    const body = await req.json();
    const { industrialProjectId: rawIndustrialProjectId, studentUserIds, supervisorUserId } = body;
    
    if (!rawIndustrialProjectId) {
      return NextResponse.json({ error: 'Industrial project ID is required' }, { status: 400 });
    }
    
    const industrialProjectId = typeof rawIndustrialProjectId === 'string' ? parseInt(rawIndustrialProjectId) : rawIndustrialProjectId;
    
    if (!supervisorUserId) {
      return NextResponse.json({ error: 'Please select a supervisor' }, { status: 400 });
    }
    
    const supervisorId = typeof supervisorUserId === 'string' ? parseInt(supervisorUserId) : supervisorUserId;
    
    // Get student info
    const student = await prisma.student.findUnique({ 
      where: { userId },
      select: { studentId: true, groupId: true, campusId: true }
    });
    
    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }
    
    // Check if student is already in a group
    if (student.groupId) {
      return NextResponse.json({ error: 'You are already in a group. Leave your current group before creating a new one.' }, { status: 400 });
    }
    
    // Check if student has already created a group
    const existingCreatedGroup = await (prisma as any).group.findFirst({ 
      where: { createdById: student.studentId } 
    });
    
    if (existingCreatedGroup) {
      return NextResponse.json({ error: 'You have already created a group' }, { status: 400 });
    }
    
    // Check if student has an approved request for this industrial project
    const approvedRequest = await (prisma as any).industrialProjectRequest.findUnique({
      where: {
        industrialProjectId_requesterId: {
          industrialProjectId,
          requesterId: userId
        }
      }
    });
    
    if (!approvedRequest || approvedRequest.status !== 'approved') {
      return NextResponse.json({ 
        error: 'You do not have an approved request for this industrial project' 
      }, { status: 403 });
    }
    
    // Check if industrial project exists and is available
    const industrialProject = await (prisma as any).industrialProject.findUnique({
      where: { id: industrialProjectId }
    });
    
    if (!industrialProject) {
      return NextResponse.json({ error: 'Industrial project not found' }, { status: 404 });
    }
    
    if (industrialProject.assignedGroupId) {
      return NextResponse.json({ error: 'This industrial project has already been assigned to a group' }, { status: 400 });
    }
    
    // Check invited students
    const invitedStudentIds: number[] = (studentUserIds || []).map((id: any) => 
      typeof id === 'string' ? parseInt(id) : id
    );
    
    if (invitedStudentIds.length > 2) {
      return NextResponse.json({ error: 'You can invite maximum 2 other students' }, { status: 400 });
    }
    
    if (invitedStudentIds.length > 0) {
      const invitedStudents = await prisma.student.findMany({ 
        where: { 
          userId: { in: invitedStudentIds }, 
          groupId: null 
        } 
      });
      
      if (invitedStudents.length !== invitedStudentIds.length) {
        return NextResponse.json({ error: 'Some selected students are already in a group' }, { status: 400 });
      }
    }
    
    // Check supervisor
    const supervisor = await prisma.user.findUnique({ 
      where: { userId: supervisorId, role: 'supervisor' } 
    });
    
    if (!supervisor) {
      return NextResponse.json({ error: 'Supervisor not found' }, { status: 404 });
    }
    
    // Create the group (no projectId - this is for industrial project)
    const group = await (prisma as any).group.create({ 
      data: { 
        groupName: industrialProject.title, 
        projectId: null,  // No regular project
        createdById: student.studentId, 
        supervisorId: null, 
        isFull: false 
      } 
    });
    
    // Update the student to be in the group and as admin
    await (prisma as any).student.update({ 
      where: { studentId: student.studentId }, 
      data: { groupId: group.groupId, isGroupAdmin: true } 
    });
    
    // Link the industrial project to this group
    await (prisma as any).industrialProject.update({
      where: { id: industrialProjectId },
      data: {
        status: 'booked',
        assignedGroupId: group.groupId
      }
    });
    
    // Update the request with the group ID
    await (prisma as any).industrialProjectRequest.update({
      where: { id: approvedRequest.id },
      data: { groupId: group.groupId }
    });
    
    // Create conversation and group chat
    const conversation = await (prisma as any).conversation.create({ data: {} });
    await (prisma as any).conversationParticipant.create({ 
      data: { conversationId: conversation.conversationId, userId } 
    });
    await (prisma as any).groupChat.create({ 
      data: { groupId: group.groupId, conversationId: conversation.conversationId } 
    });
    await (prisma as any).message.create({ 
      data: { 
        conversationId: conversation.conversationId, 
        senderId: userId, 
        content: `Group "${industrialProject.title}" has been created for industrial project!` 
      } 
    });
    
    // Send invitations to selected students
    for (const studentUserId of invitedStudentIds) {
      await (prisma as any).groupInvitation.create({ 
        data: { 
          groupId: group.groupId, 
          inviterId: userId, 
          inviteeId: studentUserId, 
          inviteeRole: 'student', 
          message: `You have been invited to join "${industrialProject.title}" (Industrial Project)` 
        } 
      });
    }
    
    // Send invitation to supervisor
    await (prisma as any).groupInvitation.create({ 
      data: { 
        groupId: group.groupId, 
        inviterId: userId, 
        inviteeId: supervisorId, 
        inviteeRole: 'supervisor', 
        message: `You have been invited to supervise "${industrialProject.title}" (Industrial Project)` 
      } 
    });
    
    return NextResponse.json({ 
      success: true, 
      group: { ...group, conversationId: conversation.conversationId }, 
      message: 'Group created for industrial project! Invitations sent.' 
    });
  } catch (error) {
    console.error('Error creating industrial project group:', error);
    return NextResponse.json({ error: 'Failed to create group' }, { status: 500 });
  }
}

// GET - Get approved industrial projects for the current student that can be used to create a group
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    if (session.user.role !== 'student') {
      return NextResponse.json({ error: 'Only students can access this' }, { status: 403 });
    }
    
    const userId = parseInt(session.user.id);
    
    // Get student info
    const student = await prisma.student.findUnique({ 
      where: { userId },
      select: { studentId: true, groupId: true }
    });
    
    // Get approved industrial project requests for this student
    const approvedRequests = await (prisma as any).industrialProjectRequest.findMany({
      where: {
        requesterId: userId,
        status: 'approved'
      },
      include: {
        industrialProjects: true
      }
    });
    
    // Filter to only include projects that haven't been assigned to a group yet
    const availableProjects = approvedRequests
      .filter((req: any) => !req.industrialProjects.assignedGroupId)
      .map((req: any) => ({
        id: req.industrialProjects.id,
        title: req.industrialProjects.title,
        description: req.industrialProjects.description,
        techStack: req.industrialProjects.techStack,
        features: req.industrialProjects.features,
        thumbnailUrl: req.industrialProjects.thumbnailUrl,
        requestId: req.id,
        approvedAt: req.respondedAt
      }));
    
    return NextResponse.json({ 
      approvedProjects: availableProjects,
      hasGroup: !!student?.groupId
    });
  } catch (error) {
    console.error('Error fetching approved industrial projects:', error);
    return NextResponse.json({ error: 'Failed to fetch approved projects' }, { status: 500 });
  }
}
